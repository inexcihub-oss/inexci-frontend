import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneOptionalSchema,
  cpfOptionalSchema,
  strongPasswordSchema,
  passwordsMatchRefine,
} from "./shared";

// ─── Perfil de usuário ────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  document: cpfOptionalSchema,
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
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .superRefine((data, ctx) =>
    passwordsMatchRefine(
      { password: data.newPassword, confirmPassword: data.confirmPassword },
      ctx,
    ),
  );

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Cabeçalho de documentos ──────────────────────────────────────────────────

export const doctorHeaderSchema = z.object({
  logo_url: z.string().nullable().optional(),
  logo_position: z.enum(["left", "right"]).default("left"),
  content_html: z
    .string()
    .max(10000, "O conteúdo deve ter no máximo 10.000 caracteres.")
    .nullable()
    .optional(),
});

export type DoctorHeaderInput = z.infer<typeof doctorHeaderSchema>;
