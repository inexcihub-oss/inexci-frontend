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
  contactName: z.string().optional().or(z.literal("")),
  contactPhone: phoneOptionalSchema,
  contactEmail: emailOptionalSchema,
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
