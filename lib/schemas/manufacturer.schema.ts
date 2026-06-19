import { z } from "zod";
import {
  cnpjOptionalSchema,
  emailOptionalSchema,
  phoneOptionalSchema,
} from "./shared";

export const createManufacturerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do fabricante.")
    .max(120, "Nome muito longo."),
  cnpj: cnpjOptionalSchema,
  anvisaRegistration: z.string().optional().or(z.literal("")),
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  contactName: z.string().optional().or(z.literal("")),
  contactPhone: phoneOptionalSchema,
  contactEmail: emailOptionalSchema,
});

export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
