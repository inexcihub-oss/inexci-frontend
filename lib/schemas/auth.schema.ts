import { z } from "zod";
import {
  emailSchema,
  strongPasswordSchema,
  passwordsMatchRefine,
} from "./shared";

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Forgot password — etapa 1 (e-mail) ───────────────────────────────────────

export const forgotPasswordEmailSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

// ─── Forgot password — etapa 2 (código) ───────────────────────────────────────

export const forgotPasswordCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Informe o código de verificação.")
    .regex(/^\d{4,8}$/, "Código deve conter apenas dígitos."),
});

export type ForgotPasswordCodeInput = z.infer<typeof forgotPasswordCodeSchema>;

// ─── Forgot password — etapa 3 (nova senha) ───────────────────────────────────

export const newPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .superRefine(passwordsMatchRefine);

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
