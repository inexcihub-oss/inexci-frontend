import { z } from "zod";
import {
  emailSchema,
  strongPasswordSchema,
  passwordsMatchRefine,
} from "./shared";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordEmailSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

export const forgotPasswordCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Informe os 6 dígitos do código.")
    .regex(/^\d{6}$/, "O código deve conter apenas dígitos."),
});

export type ForgotPasswordCodeInput = z.infer<typeof forgotPasswordCodeSchema>;

export const newPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .superRefine(passwordsMatchRefine);

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const MFA_TOTP_REGEX = /^\d{6}$/;
export const MFA_RECOVERY_REGEX = /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/;

export const mfaTotpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(MFA_TOTP_REGEX, "Informe os 6 dígitos do aplicativo autenticador."),
});

export type MfaTotpCodeInput = z.infer<typeof mfaTotpCodeSchema>;

export const mfaRecoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(
      MFA_RECOVERY_REGEX,
      "Informe um código de recuperação no formato XXXXX-XXXXX.",
    ),
});

export type MfaRecoveryCodeInput = z.infer<typeof mfaRecoveryCodeSchema>;

export const mfaDisableSchema = z.object({
  password: z.string().min(1, "Informe sua senha atual."),
  code: z
    .string()
    .trim()
    .refine(
      (value) => MFA_TOTP_REGEX.test(value) || MFA_RECOVERY_REGEX.test(value),
      "Informe o código do aplicativo ou um código de recuperação.",
    ),
});

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
