import { z } from "zod";
import { emailOptionalSchema, phoneOptionalSchema } from "./shared";

export const createHealthPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do convênio.")
    .max(120, "Nome muito longo."),
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
});

export type CreateHealthPlanInput = z.infer<typeof createHealthPlanSchema>;
