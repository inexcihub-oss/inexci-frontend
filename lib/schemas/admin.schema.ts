import { z } from "zod";
import {
  REASON_MAX,
  REASON_MIN,
} from "@/components/admin/accounts/subscription/reason";

export const adminReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN, `Informe o motivo (mínimo de ${REASON_MIN} caracteres).`)
    .max(REASON_MAX, `O motivo pode ter no máximo ${REASON_MAX} caracteres.`),
});

export type AdminReasonInput = z.infer<typeof adminReasonSchema>;
