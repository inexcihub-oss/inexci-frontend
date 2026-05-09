import { z } from "zod";
import { emailSchema, phoneOptionalSchema, cepSchema } from "./shared";
import { isValidCpf, isValidCnpj } from "@/lib/validators";
import { unmask } from "@/lib/masks";

/**
 * Schema do AddCardModal. Os nomes batem com `SavePaymentMethodPayload`
 * (camel case do gateway), exceto pela máscara aplicada no front.
 */
export const addCardSchema = z.object({
  number: z
    .string()
    .refine(
      (v) => {
        const d = unmask(v);
        return d.length >= 13 && d.length <= 19;
      },
      "Número do cartão inválido.",
    ),
  holderName: z.string().trim().min(2, "Informe o nome impresso no cartão."),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Validade no formato MM/AA."),
  ccv: z.string().regex(/^\d{3,4}$/, "CCV inválido."),
  holderInfoName: z.string().trim().min(2, "Informe o nome do titular."),
  holderInfoEmail: emailSchema,
  holderInfoCpfCnpj: z
    .string()
    .refine(
      (v) => {
        const d = unmask(v);
        return d.length === 11 || d.length === 14;
      },
      "CPF ou CNPJ deve ter 11 ou 14 dígitos.",
    )
    .refine(
      (v) => {
        const d = unmask(v);
        return d.length === 11 ? isValidCpf(d) : isValidCnpj(d);
      },
      "CPF/CNPJ inválido.",
    ),
  holderInfoPhone: phoneOptionalSchema,
  holderInfoPostalCode: cepSchema,
  holderInfoAddressNumber: z.string().trim().min(1, "Informe o número."),
  holderInfoAddressComplement: z.string().optional().or(z.literal("")),
});

export type AddCardInput = z.infer<typeof addCardSchema>;
