"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadWithProgress } from "@/lib/upload";

type CaptureState = "idle" | "preview" | "uploading" | "success" | "error";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type ReceiptCaptureProps = {
  onUploaded: () => void;
};

export function ReceiptCapture({ onUploaded }: ReceiptCaptureProps) {
  const [state, setState] = useState<CaptureState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const resetToIdle = useCallback(() => {
    revokePreview(previewUrl);
    abortRef.current?.abort();
    abortRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setClientKey(null);
    setProgress(0);
    setError(null);
    setState("idle");
    if (cameraRef.current) cameraRef.current.value = "";
    if (fallbackRef.current) fallbackRef.current.value = "";
  }, [previewUrl, revokePreview]);

  useEffect(() => {
    return () => {
      revokePreview(previewUrl);
      abortRef.current?.abort();
    };
  }, [previewUrl, revokePreview]);

  function handleFileSelected(selected: File) {
    revokePreview(previewUrl);
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
    setClientKey(crypto.randomUUID());
    setProgress(0);
    setError(null);
    setState("preview");
  }

  async function submitCapture() {
    if (!file || !clientKey) return;

    setState("uploading");
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("clientKey", clientKey);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { status, json } = await uploadWithProgress({
        url: "/api/receipts",
        formData,
        onProgress: setProgress,
        signal: controller.signal,
      });

      if (status === 200 || status === 201) {
        setState("success");
        onUploaded();
        window.setTimeout(() => resetToIdle(), 1500);
        return;
      }

      const body = json as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? "Upload failed");
      setState("error");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("preview");
        return;
      }
      setError("Could not reach the server. Check your connection and try again.");
      setState("error");
    } finally {
      abortRef.current = null;
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  if (state === "success") {
    return (
      <div className="card capture-card">
        <p className="capture-success" role="status">
          Receipt queued
        </p>
      </div>
    );
  }

  if (state === "preview" || state === "uploading" || state === "error") {
    return (
      <div className="card capture-card">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Receipt preview" className="capture-preview" />
        )}

        {state === "uploading" && (
          <>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <button type="button" className="btn btn-block" onClick={cancelUpload}>
              Cancel
            </button>
          </>
        )}

        {state === "error" && error && <p className="error">{error}</p>}

        {(state === "preview" || state === "error") && (
          <div className="capture-preview-actions">
            {state === "error" && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={submitCapture}
              >
                Retry
              </button>
            )}
            {state === "preview" && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={submitCapture}
              >
                Use this photo
              </button>
            )}
            <button type="button" className="btn btn-block" onClick={resetToIdle}>
              Retake
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card capture-card">
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="visually-hidden"
        data-testid="camera-input"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileSelected(selected);
        }}
      />
      <input
        ref={fallbackRef}
        type="file"
        accept={ACCEPT}
        className="visually-hidden"
        data-testid="fallback-input"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileSelected(selected);
        }}
      />
      <div className="capture-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </button>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => fallbackRef.current?.click()}
        >
          Choose file
        </button>
      </div>
    </div>
  );
}
