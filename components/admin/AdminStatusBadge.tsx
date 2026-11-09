import {
  ADMIN_SITUATION_META,
  describeSituation,
  type SituationInput,
} from "@/lib/admin-account-status";
import { cn } from "@/lib/utils";

export function AdminStatusBadge({
  account,
  compact = false,
}: {
  account: SituationInput;
  compact?: boolean;
}) {
  const meta = ADMIN_SITUATION_META[account.situation];
  const hint = compact ? null : describeSituation(account);
  return (
    <span
      className={cn("ds-badge-md whitespace-nowrap", meta.className)}
      data-situation={account.situation}
    >
      {hint ? `${meta.label} · ${hint}` : meta.label}
    </span>
  );
}
