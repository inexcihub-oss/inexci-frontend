import { z } from "zod";
import { emailOptionalSchema, phoneOptionalSchema } from "./shared";

export const createHospitalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do hospital.")
    .max(120, "Nome muito longo."),
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
});

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
