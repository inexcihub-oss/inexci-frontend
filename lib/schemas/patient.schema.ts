import { z } from "zod";
import {
  fullNameSchema,
  emailOptionalSchema,
  phoneOptionalSchema,
  cpfSchema,
  cpfOptionalSchema,
} from "./shared";

/**
 * Schema enxuto usado pela criação rápida no wizard de Solicitação Cirúrgica.
 * Aqui o CPF continua obrigatório: o paciente nasce para uma SC, e a SC não
 * avança sem CPF — pedir agora evita a pendência logo em seguida.
 */
export const createPatientQuickSchema = z.object({
  name: fullNameSchema,
  cpf: cpfSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
});

export type CreatePatientQuickInput = z.infer<typeof createPatientQuickSchema>;

/**
 * Schema completo (NewPatientModal — tela de pacientes e agenda). CPF é
 * opcional: estrangeiros, menores e pacientes migrados podem não ter. Quando
 * informado, continua validado.
 */
export const createPatientSchema = z.object({
  name: fullNameSchema,
  cpf: cpfOptionalSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  healthPlanId: z.string().optional().or(z.literal("")),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
