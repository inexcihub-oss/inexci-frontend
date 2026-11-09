import { formatBrlCents } from "@/lib/admin-format";
import type { AdminCoupon } from "@/services/admin.service";

export const COUPON_SITUATION_META: Record<
  AdminCoupon["situation"],
  { label: string; className: string }
> = {
  ativo: { label: "Ativo", className: "bg-emerald-50 text-emerald-700" },
  esgotado: { label: "Esgotado", className: "bg-amber-50 text-amber-700" },
  expirado: { label: "Expirado", className: "bg-red-50 text-red-700" },
  desativado: { label: "Desativado", className: "bg-gray-100 text-gray-600" },
};

type DiscountInput = Pick<
  AdminCoupon,
  "percentOff" | "amountOffCents" | "duration" | "durationInMonths"
>;

export function describeCouponDiscount(coupon: DiscountInput): string {
  const amount =
    coupon.percentOff !== null
      ? `${coupon.percentOff}%`
      : formatBrlCents(coupon.amountOffCents ?? 0);
  if (coupon.duration === "forever") return `${amount} para sempre`;
  if (coupon.duration === "repeating") {
    const months = coupon.durationInMonths ?? 0;
    return `${amount} por ${months} ${months === 1 ? "mês" : "meses"}`;
  }
  return coupon.percentOff !== null
    ? `${amount} na primeira cobrança`
    : `${amount} uma vez`;
}

export function describeCouponUses(
  coupon: Pick<AdminCoupon, "timesRedeemed" | "maxRedemptions">,
): string {
  return `${coupon.timesRedeemed} / ${coupon.maxRedemptions ?? "∞"}`;
}
