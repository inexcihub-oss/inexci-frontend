import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneSchema,
  phoneOptionalSchema,
} from "./shared";

export const createCollaboratorSchema = z
  .object({
    name: fullNameSchema,
    phone: phoneOptionalSchema,
    email: emailSchema,
    is_doctor: z.boolean().default(false),
    crm: z.string().optional().or(z.literal("")),
    crm_state: z.string().optional().or(z.literal("")),
    specialty: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.is_doctor) {
      if (!data.crm || !data.crm.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o número do CRM.",
          path: ["crm"],
        });
      }
      if (!data.crm_state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o estado do CRM.",
          path: ["crm_state"],
        });
      }
    }
  });

export type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

/** Modal rápido (CreateManagerModal). */
export const createManagerSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
