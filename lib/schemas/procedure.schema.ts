import { z } from "zod";

export const createProcedureSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do procedimento.")
    .max(160, "Nome muito longo."),
});

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>;

export const createProcedureModelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do modelo.")
    .max(160, "Nome muito longo."),
  procedure_id: z.string().optional().or(z.literal("")),
  procedure_name: z.string().optional().or(z.literal("")),
});

export type CreateProcedureModelInput = z.infer<typeof createProcedureModelSchema>;
