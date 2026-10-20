import { z } from "zod";
import {
  fullNameSchema,
  emailSchema,
  phoneSchema,
} from "./shared";
import { Permission } from "@/lib/permissions";

export const createCollaboratorSchema = z
  .object({
    name: fullNameSchema,
    phone: phoneSchema,
    email: emailSchema,
    isDoctor: z.boolean().default(false),
    council: z
      .enum(["CRM", "CRP", "CRN", "COREN", "CREFITO", "CRFA", "CRO", "CRBM", "CREF", "OUTRO"])
      .default("CRM"),
    crm: z.string().optional().or(z.literal("")),
    crmState: z.string().optional().or(z.literal("")),
    specialty: z.string().optional().or(z.literal("")),
    permissions: z.array(z.nativeEnum(Permission)).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.isDoctor && (data.council ?? "CRM") === "CRM") {
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
          path: ["crmState"],
        });
      }
    }
  });

export type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

export const createManagerSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
