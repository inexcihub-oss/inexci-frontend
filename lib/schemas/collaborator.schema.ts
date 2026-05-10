import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneSchema,
} from "./shared";

export const createCollaboratorSchema = z
  .object({
    name: fullNameSchema,
    phone: phoneSchema,
    email: emailSchema,
    isDoctor: z.boolean().default(false),
    crm: z.string().optional().or(z.literal("")),
    crmState: z.string().optional().or(z.literal("")),
    specialty: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.isDoctor) {
      if (!data.crm || !data.crm.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o número do CRM.",
          path: ["crm"],
        });
      }
      if (!data.crmState) {
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
