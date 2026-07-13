"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@/components/ui/Icon";

export type ToastKind = "success" | "error" | "info";

type ToastInput = {
  kind: ToastKind;
  message: string;
  timeoutMs?: number;
};

type Toast = ToastInput & { id: number };

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TIMEOUT = 4000;

const ICONS: Record<ToastKind, IconDefinition> = {
  success: faCircleCheck,
  error: faCircleExclamation,
  info: faCircleInfo,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({ kind, message, timeoutMs = DEFAULT_TIMEOUT }: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message, timeoutMs }]);
      if (timeoutMs > 0) {
        window.setTimeout(() => dismiss(id), timeoutMs);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.kind}`}>
              <Icon name={ICONS[toast.kind]} className="toast-icon" />
              <span className="toast-message">{toast.message}</span>
              <button
                type="button"
                className="toast-dismiss"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <Icon name={faXmark} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
