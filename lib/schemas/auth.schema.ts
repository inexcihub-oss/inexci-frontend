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
