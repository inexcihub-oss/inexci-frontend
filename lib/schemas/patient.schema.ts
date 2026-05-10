import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneSchema,
  cpfOptionalSchema,
} from "./shared";

/** Schema enxuto usado pela criação rápida no wizard. */
export const createPatientQuickSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export type CreatePatientQuickInput = z.infer<typeof createPatientQuickSchema>;

/** Schema completo (NewPatientModal). */
export const createPatientSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  cpf: cpfOptionalSchema,
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  healthPlanId: z.string().optional().or(z.literal("")),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
