"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Toast } from "@/components/ui/Toast";
import {
  ToastContext,
  type ToastContextValue,
  type ToastState,
} from "@/hooks/useToast";
import type { ToastType } from "@/types/toast.types";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastState & { id: number }) | null>(
    null,
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info") =>
      setToast((prev) => ({ message, type, id: (prev?.id ?? 0) + 1 })),
    [],
  );
  const hideToast = useCallback(() => setToast(null), []);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, hideToast }),
    [showToast, hideToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}
