import { z } from "zod";
import {
  cnpjOptionalSchema,
  emailOptionalSchema,
  phoneOptionalSchema,
} from "./shared";

export const createClinicSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da clínica.")
    .max(120, "Nome muito longo."),
  cnpj: cnpjOptionalSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  city: z.string().trim().optional(),
  state: z.string().optional(),
});

export type CreateClinicInput = z.infer<typeof createClinicSchema>;
