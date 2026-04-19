import { z } from "zod";

// ─── Etapa 1 — Dados pessoais ─────────────────────────────────────────────────

export const step1Schema = z
  .object({
    name: z
      .string()
      .min(3, "O nome deve ter pelo menos 3 caracteres.")
      .max(100, "O nome deve ter no máximo 100 caracteres.")
      .regex(/\S+\s+\S+/, "Informe nome e sobrenome."),
    email: z
      .string()
      .min(1, "O e-mail é obrigatório.")
      .email("Informe um e-mail válido."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

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
