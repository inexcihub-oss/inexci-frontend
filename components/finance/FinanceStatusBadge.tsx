import { cn } from "@/lib/utils";
import {
  RECEIVABLE_STATUS_LABELS,
  ReceivableStatus,
} from "@/types/finance.types";

const CORES: Record<ReceivableStatus, string> = {
  [ReceivableStatus.OPEN]: "bg-amber-50 text-amber-800 border-amber-200",
  [ReceivableStatus.PARTIAL]: "bg-blue-50 text-blue-700 border-blue-200",
  [ReceivableStatus.PAID]: "bg-green-50 text-green-700 border-green-200",
  [ReceivableStatus.CANCELLED]: "bg-red-50 text-red-700 border-red-200",
};

interface FinanceStatusBadgeProps {
  status: ReceivableStatus;
  size?: "sm" | "xs";
  className?: string;
}

export function FinanceStatusBadge({
  status,
  size = "sm",
  className,
}: FinanceStatusBadgeProps) {
  return (
    <span
      data-testid="finance-status-badge"
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 text-[10px] leading-4",
        CORES[status],
        className,
      )}
    >
      {RECEIVABLE_STATUS_LABELS[status]}
    </span>
  );
}
