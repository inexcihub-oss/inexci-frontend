import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /**
   * Progress value from 0 to 100
   */
  value: number;
  /**
   * Height size of the progress bar
   */
  size?: "sm" | "md" | "lg";
  /**
   * Color variant of the progress bar
   */
  variant?: "default" | "success" | "warning" | "danger" | "info" | "primary";
  /**
   * Show percentage text inside or next to the bar
   */
  showLabel?: boolean;
  /**
   * Label position
   */
  labelPosition?: "inside" | "right";
  /**
   * Additional className for the container
   */
  className?: string;
  /**
   * Animate the progress bar
   */
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
  // Clamp value between 0 and 100
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
        <span className="text-sm text-gray-600 font-medium min-w-[3rem] text-right">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}

interface StatusProgressBarProps {
  /**
   * Current status number (1-10)
   */
  currentStatus: number;
  /**
   * Total number of statuses in the flow
   */
  totalStatuses?: number;
  /**
   * Show step labels
   */
  showSteps?: boolean;
  /**
   * Status labels to display
   */
  statusLabels?: string[];
  className?: string;
}

const defaultStatusLabels = [
  "Pendente",
  "Enviada",
  "Em Análise",
  "Em Reanálise",
  "Autorizada",
  "Agendada",
  "A Faturar",
  "Faturada",
  "Finalizada",
  "Cancelada",
];

export function StatusProgressBar({
  currentStatus,
  totalStatuses = 9, // Excluding Cancelada as it's not a step in the normal flow
  showSteps = false,
  statusLabels = defaultStatusLabels,
  className,
}: StatusProgressBarProps) {
  // Cancelada (10) is not part of the normal progress
  const isCancelled = currentStatus === 10;

  // Calculate progress based on status (excluding Em Reanálise and Cancelada from normal flow)
  // Normal flow: 1 -> 2 -> 3 -> 5 -> 6 -> 7 -> 8 -> 9
  const statusToProgress: Record<number, number> = {
    1: 12.5, // Pendente
    2: 25, // Enviada
    3: 37.5, // Em Análise
    4: 37.5, // Em Reanálise (same as Em Análise)
    5: 50, // Autorizada
    6: 62.5, // Agendada
    7: 75, // A Faturar
    8: 87.5, // Faturada
    9: 100, // Finalizada
    10: 0, // Cancelada
  };

  const progress = statusToProgress[currentStatus] || 0;

  return (
    <div className={cn("space-y-2", className)}>
      <ProgressBar
        value={progress}
        size="md"
        variant={
          isCancelled ? "danger" : currentStatus >= 5 ? "success" : "primary"
        }
        showLabel
        labelPosition="right"
      />
      {showSteps && (
        <div className="flex justify-between text-xs text-gray-500">
          {statusLabels.slice(0, -1).map((label, index) => (
            <span
              key={label}
              className={cn(
                index + 1 <= currentStatus && "text-primary-600 font-medium",
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
