import { cn } from "@/lib/utils";
import { Pendency } from "@/types/surgery-request.types";
import Button from "@/components/ui/Button";
import {
  getPendencyAction,
  executePendencyNavigation,
  isWaitingPendency,
} from "@/lib/pendency-navigation";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Building2,
  Stethoscope,
  Heart,
  Package,
  ArrowRight,
} from "lucide-react";

interface PendencyItemProps {
  pendency: Pendency;
  onComplete?: (pendencyId: string) => void;
  isLoading?: boolean;
  showResponsible?: boolean;
  compact?: boolean;
  className?: string;
}

const responsibleIcons: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  collaborator: User,
  hospital: Building2,
  health_plan: Heart,
  supplier: Package,
};

const responsibleLabels: Record<string, string> = {
  doctor: "Médico",
  collaborator: "Colaborador",
  hospital: "Hospital",
  health_plan: "Plano de Saúde",
  supplier: "Fornecedor",
};

export function PendencyItem({
  pendency,
  onComplete,
  isLoading = false,
  showResponsible = true,
  compact = false,
  className,
}: PendencyItemProps) {
  const isCompleted = pendency.concluded;
  const isWaiting = pendency.is_waiting || isWaitingPendency(pendency.key);
  const isOptional = pendency.is_optional;

  const action = getPendencyAction(pendency.key);

  const ResponsibleIcon = pendency.responsible_type
    ? responsibleIcons[pendency.responsible_type] || User
    : User;

  const handleNavigate = () => {
    if (action) {
      executePendencyNavigation(action);
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isWaiting) {
      return <Clock className="h-5 w-5 text-amber-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Concluída
        </span>
      );
    }
    if (isWaiting) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Aguardando
        </span>
      );
    }
    if (isOptional) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Opcional
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Pendente
      </span>
    );
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-1.5",
          isCompleted && "opacity-60",
          className,
        )}
      >
        {getStatusIcon()}
        <span
          className={cn(
            "text-sm flex-1",
            isCompleted && "line-through text-gray-500",
          )}
        >
          {pendency.name || pendency.key}
        </span>
        {!isCompleted && !isWaiting && action && (
          <button
            onClick={handleNavigate}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {!isCompleted && !isWaiting && !action && onComplete && (
          <button
            onClick={() => onComplete(pendency.id)}
            disabled={isLoading}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Concluir
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200",
        className,
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4
            className={cn(
              "text-sm font-medium",
              isCompleted ? "text-gray-500 line-through" : "text-gray-900",
            )}
          >
            {pendency.name || pendency.key}
          </h4>
          {getStatusBadge()}
        </div>

        {pendency.description && (
          <p className="text-xs text-gray-500 mb-1">{pendency.description}</p>
        )}

        {showResponsible && pendency.responsible_type && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ResponsibleIcon className="h-3.5 w-3.5" />
            <span>
              {responsibleLabels[pendency.responsible_type] ||
                pendency.responsible_type}
            </span>
          </div>
        )}

        {pendency.concluded_at && (
          <p className="text-xs text-gray-400 mt-1">
            Concluída em{" "}
            {new Date(pendency.concluded_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 flex gap-2">
        {!isCompleted && !isWaiting && action && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigate}
            className="flex items-center gap-1"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        {!isCompleted && !isWaiting && onComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onComplete(pendency.id)}
            isLoading={isLoading}
          >
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
