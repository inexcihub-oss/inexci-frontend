import { useEffect, useRef } from "react";
import { useToast } from "./useToast";
import { getStatusLabel } from "@/lib/surgery-request-status";

interface StatusChangeNotificationOptions {
  currentStatus: number;
  surgeryRequestId: string | number;
  onStatusChange?: (newStatus: number) => void;
}

const label = (status: number) => getStatusLabel(status) ?? "Desconhecido";

export function useStatusChangeNotification({
  currentStatus,
  surgeryRequestId,
  onStatusChange,
}: StatusChangeNotificationOptions) {
  const previousStatus = useRef<number>(currentStatus);
  const previousRequestId = useRef<string | number>(surgeryRequestId);
  const { showSuccess } = useToast();

  useEffect(() => {
    if (previousRequestId.current !== surgeryRequestId) {
      previousRequestId.current = surgeryRequestId;
      previousStatus.current = currentStatus;
      return;
    }

    if (
      previousStatus.current !== currentStatus &&
      previousStatus.current !== 0
    ) {
      const prevLabel = label(previousStatus.current);
      const newLabel = label(currentStatus);

      showSuccess(`Status atualizado: "${prevLabel}" → "${newLabel}"`);
      onStatusChange?.(currentStatus);
    }

    previousStatus.current = currentStatus;
  }, [currentStatus, onStatusChange, showSuccess, surgeryRequestId]);

  return {
    previousStatus: previousStatus.current,
    currentStatus,
    statusLabel: getStatusLabel(currentStatus),
  };
}
