import { z } from "zod";

export const COUPON_CODE_RE = /^[A-Z0-9-]{3,40}$/;

const BRL_THOUSANDS_RE = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/;
const BRL_SIMPLE_RE = /^\d+([.,]\d{1,2})?$/;

export function parseBrlToCents(value: string): number | null {
  const text = value.trim();
  let normalized: string;
  if (BRL_THOUSANDS_RE.test(text)) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (BRL_SIMPLE_RE.test(text)) {
    normalized = text.replace(",", ".");
  } else {
    return null;
  }
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 ? cents : null;
}

export function endOfDaySp(isoDate: string): string {
  return `${isoDate}T23:59:59-03:00`;
}

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(COUPON_CODE_RE, "Use de 3 a 40 letras, números ou hífen."),
    discountType: z.enum(["percent", "amount"]),
    value: z.string().trim(),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.string().trim(),
    maxRedemptions: z.string().trim(),
    redeemBy: z.string().trim(),
    planIds: z.array(z.string()).max(20, "Escolha no máximo 20 planos."),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percent") {
      const n = Number(data.value);
      if (!/^\d+$/.test(data.value) || n < 1 || n > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Informe um percentual inteiro de 1 a 100.",
        });
      }
    } else if (parseBrlToCents(data.value) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Informe um valor válido em reais, como 100,00.",
      });
    }
    if (data.duration === "repeating") {
      const n = Number(data.durationInMonths);
      if (!/^\d+$/.test(data.durationInMonths) || n < 1 || n > 36) {
        ctx.addIssue({
          code: "custom",
          path: ["durationInMonths"],
          message: "Informe de 1 a 36 meses.",
        });
      }
    }
    if (data.maxRedemptions !== "") {
      const n = Number(data.maxRedemptions);
      if (!/^\d+$/.test(data.maxRedemptions) || n < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["maxRedemptions"],
          message: "Informe um limite inteiro maior que zero.",
        });
      }
    }
    if (
      data.redeemBy !== "" &&
      new Date(endOfDaySp(data.redeemBy)) <= new Date()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["redeemBy"],
        message: "A validade precisa ser uma data futura.",
      });
    }
  });

export type CouponFormInput = z.input<typeof couponFormSchema>;
export type CouponFormOutput = z.output<typeof couponFormSchema>;
