import React, { useState } from "react";
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { faInbox } from "@fortawesome/free-solid-svg-icons";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ConfirmProvider, useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";

afterEach(() => cleanup());

function ToastHarness() {
  const { notify } = useToast();
  return (
    <button onClick={() => notify({ kind: "success", message: "Saved!" })}>fire</button>
  );
}

function ConfirmHarness() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("none");
  return (
    <div>
      <button
        onClick={async () => {
          const ok = await confirm({ title: "Delete?", message: "Sure?" });
          setResult(ok ? "confirmed" : "cancelled");
        }}
      >
        ask
      </button>
      <span data-testid="result">{result}</span>
    </div>
  );
}

describe("Toast", () => {
  it("shows a notification and dismisses it", async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("fire"));
    expect(await screen.findByText("Saved!")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    await waitFor(() => expect(screen.queryByText("Saved!")).not.toBeInTheDocument());
  });
});

describe("ConfirmDialog", () => {
  it("resolves true when confirmed", async () => {
    render(
      <ConfirmProvider>
        <ConfirmHarness />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByText("ask"));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("confirmed"),
    );
  });

  it("resolves false when cancelled with no side effects", async () => {
    render(
      <ConfirmProvider>
        <ConfirmHarness />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByText("ask"));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("cancelled"),
    );
  });
});

describe("EmptyState", () => {
  it("renders title, description, and action", () => {
    render(
      <EmptyState
        icon={faInbox}
        title="No receipts"
        description="Upload a receipt to get started."
        action={<button>Upload</button>}
      />,
    );
    expect(screen.getByText("No receipts")).toBeInTheDocument();
    expect(screen.getByText("Upload a receipt to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });
});
