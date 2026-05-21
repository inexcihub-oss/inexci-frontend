import { z } from "zod";

/**
 * Schema do AddCardModal com Stripe Elements.
 * Os dados do cartão (número, validade, CCV) são coletados pelo CardElement
 * do Stripe e nunca passam pelo nosso formulário/validação.
 */
export const addCardSchema = z.object({
  holderName: z.string().trim().min(2, "Informe o nome do titular"),
});

export type AddCardInput = z.infer<typeof addCardSchema>;
