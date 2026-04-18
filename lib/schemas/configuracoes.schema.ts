import { z } from "zod";

// ─── Perfil de usuário ────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length >= 10,
      "Informe um telefone válido (com DDD).",
    ),
  document: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length === 11,
      "CPF deve ter 11 dígitos.",
    ),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  // Médico
  specialty: z.string().optional(),
  crm: z.string().optional(),
  crmState: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ─── Alteração de senha ───────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Digite sua senha atual."),
    newPassword: z
      .string()
      .min(6, "A nova senha deve ter pelo menos 6 caracteres.")
      .max(128, "A nova senha deve ter no máximo 128 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
