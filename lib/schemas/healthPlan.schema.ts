import { z } from "zod";
import { emailSchema, phoneSchema } from "./shared";

export const createHealthPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do convênio.")
    .max(120, "Nome muito longo."),
  phone: phoneSchema,
  email: emailSchema,
});

export type CreateHealthPlanInput = z.infer<typeof createHealthPlanSchema>;
