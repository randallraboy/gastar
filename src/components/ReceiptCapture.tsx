"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  faArrowsRotate,
  faCamera,
  faCheck,
  faCircleCheck,
  faFolderOpen,
  faRotateLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/ui/Icon";
import { uploadWithProgress } from "@/lib/upload";
import { MAX_UPLOAD_BYTES, UPLOAD_LIMIT_MB } from "@/lib/validation";

type CaptureState = "idle" | "preview" | "uploading" | "success" | "error";
type CaptureSource = "camera" | "fallback";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const NOTE_MAX = 250;

type ReceiptCaptureProps = {
  onUploaded: () => void;
};

export function ReceiptCapture({ onUploaded }: ReceiptCaptureProps) {
  const [state, setState] = useState<CaptureState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<CaptureSource>("camera");
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
    setNote("");
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

  function handleFileSelected(selected: File, source: CaptureSource) {
    sourceRef.current = source;

    if (selected.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1);
      revokePreview(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      setClientKey(null);
      setError(
        `That photo is too large (${sizeMb} MB). Images must be ${UPLOAD_LIMIT_MB} MB or smaller.`,
      );
      setState("idle");
      if (cameraRef.current) cameraRef.current.value = "";
      if (fallbackRef.current) fallbackRef.current.value = "";
      return;
    }

    revokePreview(previewUrl);
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
    setClientKey(crypto.randomUUID());
    setProgress(0);
    setError(null);
    setState("preview");
  }

  function retake() {
    const source = sourceRef.current;
    resetToIdle();
    const input = source === "camera" ? cameraRef.current : fallbackRef.current;
    input?.click();
  }

  async function submitCapture() {
    if (!file || !clientKey) return;

    setState("uploading");
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("clientKey", clientKey);
    const trimmedNote = note.trim();
    if (trimmedNote) {
      formData.set("note", trimmedNote);
    }

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

  const hiddenInputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="visually-hidden"
        data-testid="camera-input"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileSelected(selected, "camera");
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
          if (selected) handleFileSelected(selected, "fallback");
        }}
      />
    </>
  );

  if (state === "success") {
    return (
      <div className="card capture-card">
        {hiddenInputs}
        <p className="capture-success" role="status">
          <Icon name={faCircleCheck} />
          Receipt queued
        </p>
      </div>
    );
  }

  if (state === "preview" || state === "uploading" || state === "error") {
    return (
      <div className="card capture-card">
        {hiddenInputs}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Receipt preview" className="capture-preview" />
        )}

        {(state === "preview" || state === "error") && (
          <div className="form-group" style={{ marginTop: "var(--space-3)" }}>
            <label htmlFor="receipt-note">Note (optional)</label>
            <textarea
              id="receipt-note"
              className="input"
              rows={2}
              maxLength={NOTE_MAX}
              value={note}
              placeholder="e.g. the $40 fan is a Wants item, rest is groceries"
              onChange={(e) => setNote(e.target.value)}
            />
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              {NOTE_MAX - note.length} characters remaining
            </span>
          </div>
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
              <Icon name={faXmark} />
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
                <Icon name={faArrowsRotate} />
                Retry
              </button>
            )}
            {state === "preview" && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={submitCapture}
              >
                <Icon name={faCheck} />
                Use this photo
              </button>
            )}
            <button type="button" className="btn btn-block" onClick={retake}>
              <Icon name={faRotateLeft} />
              Retake
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card capture-card">
      {hiddenInputs}
      {error && <p className="error">{error}</p>}
      <div className="capture-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => cameraRef.current?.click()}
        >
          <Icon name={faCamera} />
          Take photo
        </button>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => fallbackRef.current?.click()}
        >
          <Icon name={faFolderOpen} />
          Choose file
        </button>
      </div>
    </div>
  );
}
