import { createContext, useCallback, useContext } from "react";
import { ToastType } from "@/types/toast.types";
import { logger } from "@/lib/logger";

export interface ToastState {
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

let avisouSemProvider = false;

const noopToast: ToastContextValue = {
  showToast: (message) => {
    if (process.env.NODE_ENV === "development" && !avisouSemProvider) {
      avisouSemProvider = true;
      logger.warn(
        "[useToast] chamado fora do <ToastProvider>; toast descartado",
        message,
      );
    }
  },
  hideToast: () => {},
};

export function useToast() {
  const { showToast, hideToast } = useContext(ToastContext) ?? noopToast;

  const showSuccess = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast],
  );
  const showError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );
  const showInfo = useCallback(
    (message: string) => showToast(message, "info"),
    [showToast],
  );
  const showWarning = useCallback(
    (message: string) => showToast(message, "warning"),
    [showToast],
  );

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideToast,
  };
}
