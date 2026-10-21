import { z } from "zod";
import { brlMaskToDecimal, decimalToCents } from "@/lib/currency";

export const SERVICE_PRICE_APPOINTMENT_TYPES = [
  "first_visit",
  "return",
  "follow_up",
] as const;

export const servicePriceSchema = z.object({
  doctorId: z.string(),
  appointmentType: z.enum(SERVICE_PRICE_APPOINTMENT_TYPES).or(z.literal("")),
  description: z
    .string({ required_error: "Informe a descrição." })
    .trim()
    .min(2, "Informe a descrição.")
    .max(150, "A descrição deve ter no máximo 150 caracteres."),
  amount: z
    .string()
    .refine(
      (valor) => decimalToCents(brlMaskToDecimal(valor)) > 0,
      "Informe um valor maior que zero.",
    ),
  active: z.boolean(),
});

export type ServicePriceInput = z.input<typeof servicePriceSchema>;
export type ServicePriceValues = z.output<typeof servicePriceSchema>;
