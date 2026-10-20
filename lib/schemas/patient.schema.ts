import { z } from "zod";
import {
  fullNameSchema,
  emailOptionalSchema,
  phoneOptionalSchema,
  cpfSchema,
  cpfOptionalSchema,
} from "./shared";

export const createPatientQuickSchema = z.object({
  name: fullNameSchema,
  cpf: cpfSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
});

export type CreatePatientQuickInput = z.infer<typeof createPatientQuickSchema>;

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
