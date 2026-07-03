import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/blob", () => ({
  uploadStagingBlob: vi.fn(),
  deleteBlob: vi.fn(),
  getBlobContent: vi.fn(),
  receiptImagePath: (id: string) => `/api/receipts/${id}/image`,
}));

import { uploadWithProgress } from "@/lib/upload";

class MockXHR {
  static instances: MockXHR[] = [];
  upload = { addEventListener: vi.fn() };
  status = 200;
  responseText = "{}";
  private listeners: Record<string, Array<() => void>> = {};

  open = vi.fn();
  send = vi.fn();
  abort = vi.fn();

  constructor() {
    MockXHR.instances.push(this);
  }

  addEventListener(event: string, handler: () => void) {
    this.listeners[event] = this.listeners[event] ?? [];
    this.listeners[event].push(handler);
  }

  trigger(event: string) {
    for (const handler of this.listeners[event] ?? []) {
      handler();
    }
  }

  simulateProgress(loaded: number, total: number) {
    const handlers = this.upload.addEventListener.mock.calls
      .filter(([event]) => event === "progress")
      .map(([, handler]) => handler as (e: ProgressEvent) => void);
    for (const handler of handlers) {
      handler({ lengthComputable: true, loaded, total } as ProgressEvent);
    }
  }
}

describe("uploadWithProgress", () => {
  beforeEach(() => {
    MockXHR.instances = [];
    vi.stubGlobal(
      "XMLHttpRequest",
      vi.fn(() => new MockXHR()) as unknown as typeof XMLHttpRequest,
    );
  });

  it("reports monotonic 0..1 progress and resolves with status/json", async () => {
    const progress: number[] = [];
    const promise = uploadWithProgress({
      url: "/api/receipts",
      formData: new FormData(),
      onProgress: (fraction) => progress.push(fraction),
    });

    const xhr = MockXHR.instances[0];
    xhr.simulateProgress(10, 100);
    xhr.simulateProgress(50, 100);
    xhr.status = 201;
    xhr.responseText = JSON.stringify({ id: "r1" });
    xhr.trigger("load");

    const result = await promise;
    expect(result.status).toBe(201);
    expect(result.json).toEqual({ id: "r1" });
    expect(progress).toEqual([0.1, 0.5]);
  });

  it("resolves on 4xx/5xx HTTP responses", async () => {
    const promise = uploadWithProgress({
      url: "/api/receipts",
      formData: new FormData(),
      onProgress: () => {},
    });

    const xhr = MockXHR.instances[0];
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: { message: "bad" } });
    xhr.trigger("load");

    const result = await promise;
    expect(result.status).toBe(400);
  });

  it("rejects on network error", async () => {
    const promise = uploadWithProgress({
      url: "/api/receipts",
      formData: new FormData(),
      onProgress: () => {},
    });

    MockXHR.instances[0].trigger("error");
    await expect(promise).rejects.toThrow("Network error");
  });

  it("rejects on abort via AbortSignal", async () => {
    const controller = new AbortController();
    const promise = uploadWithProgress({
      url: "/api/receipts",
      formData: new FormData(),
      onProgress: () => {},
      signal: controller.signal,
    });

    controller.abort();
    MockXHR.instances[0].trigger("abort");
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});

// silence unused import lint in environments that tree-shake oddly
void uploadWithProgress;
