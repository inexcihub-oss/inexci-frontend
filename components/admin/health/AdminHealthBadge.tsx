import { HEALTH_META, HEALTH_NO_SCORE_HINT } from "@/lib/admin-health";
import type { AdminAccountItem } from "@/services/admin.service";
import { cn } from "@/lib/utils";

export function AdminHealthBadge({
  health,
  className,
}: {
  health: AdminAccountItem["health"];
  className?: string;
}) {
  if (!health) {
    return (
      <span className="text-gray-400" title={HEALTH_NO_SCORE_HINT}>
        —
      </span>
    );
  }
  const meta = HEALTH_META[health.band];
  return (
    <span
      className={cn(
        "ds-badge-md gap-1.5 whitespace-nowrap",
        meta.badge,
        className,
      )}
      title={health.mainReason ?? undefined}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
      />
      {health.score} · {meta.label}
    </span>
  );
}
