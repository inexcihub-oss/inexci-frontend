import { z } from "zod";
import {
  emailOptionalSchema,
  phoneOptionalSchema,
  cepSchema,
} from "./shared";

export const createHospitalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do hospital.")
    .max(120, "Nome muito longo."),
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  zipCode: cepSchema,
  addressNumber: z.string().trim().min(1, "Informe o número."),
  address: z.string().trim().min(2, "Informe o endereço."),
  neighborhood: z.string().trim().min(2, "Informe o bairro."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z.string().trim().min(2, "Selecione o estado."),
});

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
