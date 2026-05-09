import { z } from "zod";
import {
  cnpjOptionalSchema,
  emailOptionalSchema,
  phoneOptionalSchema,
} from "./shared";

export const createSupplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do fornecedor.")
    .max(120, "Nome muito longo."),
  cnpj: cnpjOptionalSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  contact_name: z.string().optional().or(z.literal("")),
  contact_phone: phoneOptionalSchema,
  contact_email: emailOptionalSchema,
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
