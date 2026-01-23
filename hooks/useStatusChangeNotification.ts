import { useEffect, useRef } from "react";
import { useToast } from "./useToast";

interface StatusChangeNotificationOptions {
  currentStatus: number;
  surgeryRequestId: string;
  onStatusChange?: (newStatus: number) => void;
}

const STATUS_LABELS: Record<number, string> = {
  1: "Pendente",
  2: "Enviada",
  3: "Em Análise",
  4: "Em Reanálise",
  5: "Autorizada",
  6: "Agendada",
  7: "A Faturar",
  8: "Faturada",
  9: "Finalizada",
  10: "Cancelada",
};

/**
 * Hook para notificar mudanças de status de solicitação cirúrgica
 * Exibe um toast quando o status muda automaticamente
 */
export function useStatusChangeNotification({
  currentStatus,
  surgeryRequestId,
  onStatusChange,
}: StatusChangeNotificationOptions) {
  const previousStatus = useRef<number>(currentStatus);
  const { showSuccess } = useToast();

  useEffect(() => {
    // Só notificar se o status mudou e não é a primeira renderização
    if (
      previousStatus.current !== currentStatus &&
      previousStatus.current !== 0
    ) {
      const prevLabel = STATUS_LABELS[previousStatus.current] || "Desconhecido";
      const newLabel = STATUS_LABELS[currentStatus] || "Desconhecido";

      showSuccess(`Status atualizado: "${prevLabel}" → "${newLabel}"`);
      onStatusChange?.(currentStatus);
    }

    previousStatus.current = currentStatus;
  }, [currentStatus, onStatusChange, showSuccess]);

  return {
    previousStatus: previousStatus.current,
    currentStatus,
    statusLabel: STATUS_LABELS[currentStatus],
  };
}

/**
 * Função para obter o label de um status
 */
export function getStatusLabel(status: number): string {
  return STATUS_LABELS[status] || "Desconhecido";
}
