import { z } from "zod";
import {
  isValidCpf,
  isValidCnpj,
  isValidEmail,
  isValidFullName,
  passwordChecks,
} from "@/lib/validators";
import { unmask } from "@/lib/masks";

export const fullNameSchema = z
  .string({ required_error: "Informe o nome completo." })
  .trim()
  .min(3, "O nome deve ter pelo menos 3 caracteres.")
  .max(100, "O nome deve ter no máximo 100 caracteres.")
  .refine(isValidFullName, "Informe nome e sobrenome (sem números).");

export const emailSchema = z
  .string({ required_error: "O e-mail é obrigatório." })
  .trim()
  .min(1, "O e-mail é obrigatório.")
  .max(254, "E-mail muito longo.")
  .refine(isValidEmail, "Informe um e-mail válido.");

export const emailOptionalSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || isValidEmail(v), "Informe um e-mail válido.");

export const phoneSchema = z
  .string({ required_error: "O telefone é obrigatório." })
  .refine(
    (v) => {
      const d = unmask(v);
      return d.length === 10 || d.length === 11;
    },
    "Informe um telefone válido com DDD.",
  );

export const phoneOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => {
      if (!v) return true;
      const d = unmask(v);
      return d.length === 10 || d.length === 11;
    },
    "Informe um telefone válido com DDD.",
  );

export const cpfSchema = z
  .string({ required_error: "O CPF é obrigatório." })
  .refine((v) => unmask(v).length === 11, "CPF deve ter 11 dígitos.")
  .refine(isValidCpf, "CPF inválido.");

export const cpfOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || unmask(v).length === 11, "CPF deve ter 11 dígitos.")
  .refine((v) => !v || isValidCpf(v), "CPF inválido.");

export const cnpjSchema = z
  .string({ required_error: "O CNPJ é obrigatório." })
  .refine((v) => unmask(v).length === 14, "CNPJ deve ter 14 dígitos.")
  .refine(isValidCnpj, "CNPJ inválido.");

export const cnpjOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || unmask(v).length === 14, "CNPJ deve ter 14 dígitos.")
  .refine((v) => !v || isValidCnpj(v), "CNPJ inválido.");

export const cepSchema = z
  .string({ required_error: "O CEP é obrigatório." })
  .refine((v) => unmask(v).length === 8, "CEP deve ter 8 dígitos.");

export const cepOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || unmask(v).length === 8, "CEP deve ter 8 dígitos.");

export const strongPasswordSchema = z
  .string({ required_error: "A senha é obrigatória." })
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .refine(
    (v) => passwordChecks(v).allValid,
    "A senha deve ter maiúscula, minúscula, número e caractere especial.",
  );

export function passwordsMatchRefine<T extends { password: string; confirmPassword: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "As senhas não coincidem.",
      path: ["confirmPassword"],
    });
  }
}
