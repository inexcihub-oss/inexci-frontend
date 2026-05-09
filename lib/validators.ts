/**
 * Validadores de domínio brasileiros + helpers de senha e nome.
 * Funções puras, sem dependências.
 */

import { unmask } from "./masks";

/* ─── CPF ─────────────────────────────────────────────────────────────────── */

/**
 * Valida um CPF (formato + dígitos verificadores).
 * Aceita string com ou sem máscara.
 */
export function isValidCpf(input: string | undefined | null): boolean {
  const cpf = unmask(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calc = (slice: number[], factorStart: number) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += slice[i] * (factorStart - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const dv1 = calc(digits.slice(0, 9), 10);
  if (dv1 !== digits[9]) return false;
  const dv2 = calc(digits.slice(0, 10), 11);
  return dv2 === digits[10];
}

/* ─── CNPJ ────────────────────────────────────────────────────────────────── */

const CNPJ_FACTORS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FACTORS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidCnpj(input: string | undefined | null): boolean {
  const cnpj = unmask(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);

  const calc = (factors: number[]) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) {
      sum += digits[i] * factors[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const dv1 = calc(CNPJ_FACTORS_1);
  if (dv1 !== digits[12]) return false;
  const dv2 = calc(CNPJ_FACTORS_2);
  return dv2 === digits[13];
}

/* ─── E-mail ──────────────────────────────────────────────────────────────── */

/**
 * Validação leve de e-mail compatível com a maioria dos casos práticos.
 * Para casos críticos, prefira o `emailSchema` (Zod) que faz mais validações.
 */
export function isValidEmail(input: string | undefined | null): boolean {
  if (!input) return false;
  const value = input.trim();
  if (value.length === 0 || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/* ─── Nome completo ───────────────────────────────────────────────────────── */

/**
 * Verifica se há nome e sobrenome (≥ 2 palavras, cada uma com ≥ 2 letras).
 * Aceita acentos, hífen e abreviações com ponto final (ex.: "Dr.", "Sr.").
 * Rejeita nomes com dígitos.
 */
export function isValidFullName(input: string | undefined | null): boolean {
  if (!input) return false;
  const value = input.trim();
  if (value.length < 3) return false;
  if (/\d/.test(value)) return false;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  const wordRe = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,}\.?$/;
  return parts.every((p) => wordRe.test(p));
}

/* ─── Senha forte ─────────────────────────────────────────────────────────── */

export interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allValid: boolean;
}

/**
 * Avalia uma senha contra os requisitos de força.
 * Use no UI para checklist visual.
 */
export function passwordChecks(password: string | undefined | null): PasswordChecks {
  const value = password ?? "";
  const minLength = value.length >= 8;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    allValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

/** Conta quantos requisitos a senha atende (0-5). */
export function passwordStrength(password: string | undefined | null): number {
  const c = passwordChecks(password);
  return [c.minLength, c.hasUpper, c.hasLower, c.hasNumber, c.hasSpecial].filter(
    Boolean,
  ).length;
}

/* ─── Telefone, CEP ───────────────────────────────────────────────────────── */

export function isValidPhone(input: string | undefined | null): boolean {
  const d = unmask(input);
  return d.length === 10 || d.length === 11;
}

export function isValidCep(input: string | undefined | null): boolean {
  return unmask(input).length === 8;
}
