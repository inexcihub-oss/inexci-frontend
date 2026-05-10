import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneSchema,
  strongPasswordSchema,
  passwordsMatchRefine,
} from "./shared";

// ─── Etapa 1 — Dados pessoais ─────────────────────────────────────────────────

export const step1Schema = z
  .object({
    name: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .superRefine(passwordsMatchRefine);

export type Step1Input = z.infer<typeof step1Schema>;

// ─── Etapa 2 — Perfil ─────────────────────────────────────────────────────────

export const step2Schema = z
  .object({
    isDoctor: z.boolean(),
    crm: z.string(),
    crmState: z.string(),
    specialty: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isDoctor) {
      if (!data.crm.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o número do CRM para continuar.",
          path: ["crm"],
        });
      }
      if (!data.crmState) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o estado (UF) do seu CRM.",
          path: ["crmState"],
        });
      }
    }
  });

export type Step2Input = z.infer<typeof step2Schema>;
