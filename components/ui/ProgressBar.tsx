import { cn } from "@/lib/utils";
import {
  AUTHORIZED_STATUSES,
  FLOW_STATUSES,
  STATUS_META,
  SurgeryRequestStatusCode,
  isStatusIn,
} from "@/lib/surgery-request-status";

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger" | "info" | "primary";
  showLabel?: boolean;
  labelPosition?: "inside" | "right";
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const variantClasses = {
  default: "bg-gray-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  primary: "bg-primary-600",
};

export function ProgressBar({
  value,
  size = "md",
  variant = "primary",
  showLabel = false,
  labelPosition = "right",
  className,
  animated = true,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 bg-gray-200 rounded-full overflow-hidden",
          sizeClasses[size],
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            variantClasses[variant],
            animated && "transition-all duration-500 ease-out",
          )}
          style={{ width: `${clampedValue}%` }}
        >
          {showLabel && labelPosition === "inside" && size === "lg" && (
            <span className="flex items-center justify-center h-full text-xs text-white font-medium">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      </div>
      {showLabel && labelPosition === "right" && (
        <span className="text-xs md:text-sm text-gray-600 font-medium min-w-[3rem] text-right">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}

interface StatusProgressBarProps {
  currentStatus: number;
  showSteps?: boolean;
  className?: string;
}

export function StatusProgressBar({
  currentStatus,
  showSteps = false,
  className,
}: StatusProgressBarProps) {
  const isClosed = currentStatus === SurgeryRequestStatusCode.CLOSED;
  const position = FLOW_STATUSES.indexOf(
    currentStatus as SurgeryRequestStatusCode,
  );
  const progress =
    position < 0 ? 0 : ((position + 1) / FLOW_STATUSES.length) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <ProgressBar
        value={progress}
        size="md"
        variant={
          isClosed
            ? "danger"
            : isStatusIn(currentStatus, AUTHORIZED_STATUSES)
              ? "success"
              : "primary"
        }
        showLabel
        labelPosition="right"
      />
      {showSteps && (
        <div className="flex justify-between text-xs text-gray-500">
          {FLOW_STATUSES.map((code, index) => (
            <span
              key={code}
              title={STATUS_META[code].label}
              className={cn(
                index <= position && "text-primary-600 font-medium",
              )}
            >
              {index + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
