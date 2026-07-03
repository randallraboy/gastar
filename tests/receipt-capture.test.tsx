import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ReceiptCapture } from "@/components/ReceiptCapture";

vi.mock("@/lib/upload", () => ({
  uploadWithProgress: vi.fn(),
}));

import { uploadWithProgress } from "@/lib/upload";

const FIXED_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeFile() {
  return new File(["img"], "receipt.jpg", { type: "image/jpeg" });
}

describe("ReceiptCapture", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => FIXED_UUID,
    });
    vi.mocked(uploadWithProgress).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("idle renders Take photo and Choose file", () => {
    render(<ReceiptCapture onUploaded={() => {}} />);
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();
  });

  it("camera input has capture=environment; fallback does not", () => {
    render(<ReceiptCapture onUploaded={() => {}} />);
    expect(screen.getByTestId("camera-input")).toHaveAttribute(
      "capture",
      "environment",
    );
    expect(screen.getByTestId("fallback-input")).not.toHaveAttribute("capture");
  });

  it("file selection shows preview with Retake and Use this photo", () => {
    render(<ReceiptCapture onUploaded={() => {}} />);
    const input = screen.getByTestId("fallback-input");
    fireEvent.change(input, { target: { files: [makeFile()] } });
    expect(screen.getByRole("button", { name: "Use this photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retake" })).toBeInTheDocument();
    expect(screen.getByAltText("Receipt preview")).toBeInTheDocument();
  });

  it("Retake returns to idle without uploading", async () => {
    render(<ReceiptCapture onUploaded={() => {}} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
    expect(uploadWithProgress).not.toHaveBeenCalled();
  });

  it("submit shows uploading state then success confirmation", async () => {
    const onUploaded = vi.fn();
    let sawProgress = false;
    vi.mocked(uploadWithProgress).mockImplementation(async ({ onProgress }) => {
      onProgress(0.5);
      sawProgress = true;
      return { status: 201, json: { id: "r1" } };
    });

    render(<ReceiptCapture onUploaded={onUploaded} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    await waitFor(() => {
      expect(screen.getByText("Receipt queued")).toBeInTheDocument();
    });
    expect(sawProgress).toBe(true);
    expect(onUploaded).toHaveBeenCalled();
    expect(uploadWithProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/receipts",
      }),
    );

    const formData = vi.mocked(uploadWithProgress).mock.calls[0][0]
      .formData as FormData;
    expect(formData.get("clientKey")).toBe(FIXED_UUID);

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("failure retains preview and shows Retry with same clientKey", async () => {
    vi.mocked(uploadWithProgress)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ status: 201, json: { id: "r1" } });

    const onUploaded = vi.fn();
    render(<ReceiptCapture onUploaded={onUploaded} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
    expect(screen.getByAltText("Receipt preview")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalled();
    });

    const firstKey = (
      vi.mocked(uploadWithProgress).mock.calls[0][0].formData as FormData
    ).get("clientKey");
    const secondKey = (
      vi.mocked(uploadWithProgress).mock.calls[1][0].formData as FormData
    ).get("clientKey");
    expect(firstKey).toBe(secondKey);
  });

  it("new capture gets a new clientKey after retake", () => {
    const keys: string[] = [];
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        keys.push(`key-${keys.length}`);
        return `00000000-0000-4000-8000-00000000000${keys.length}`;
      },
    });

    render(<ReceiptCapture onUploaded={() => {}} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });

    expect(keys).toHaveLength(2);
  });

  it("progress bar reflects callback values", async () => {
    vi.mocked(uploadWithProgress).mockImplementation(async ({ onProgress }) => {
      onProgress(0.25);
      onProgress(0.75);
      return { status: 201, json: {} };
    });

    render(<ReceiptCapture onUploaded={() => {}} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
    });
  });

  it("cancel returns to preview", async () => {
    vi.mocked(uploadWithProgress).mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(<ReceiptCapture onUploaded={() => {}} />);
    fireEvent.change(screen.getByTestId("fallback-input"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Use this photo" }),
      ).toBeInTheDocument();
    });
  });
});
