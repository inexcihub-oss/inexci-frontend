import { z } from "zod";
import {
  FinancialAccountType,
  MAX_CREDIT_INSTALLMENTS,
  PaymentMethod,
  RefundReason,
} from "@/types/finance.types";
import {
  brlMaskToDecimal,
  centsToDecimal,
  decimalToCents,
} from "@/lib/currency";

export const financialAccountSchema = z.object({
  name: z
    .string({ required_error: "Informe o nome da conta." })
    .trim()
    .min(2, "Informe o nome da conta.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  type: z.nativeEnum(FinancialAccountType, {
    errorMap: () => ({ message: "Selecione o tipo da conta." }),
  }),
  notes: z
    .string()
    .trim()
    .max(1000, "As observações devem ter no máximo 1000 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type FinancialAccountInput = z.input<typeof financialAccountSchema>;
export type FinancialAccountValues = z.output<typeof financialAccountSchema>;

export const paymentMethodConfigSchema = z
  .object({
    method: z.nativeEnum(PaymentMethod),
    active: z.boolean(),
    defaultAccountId: z.string().min(1).nullable(),
    maxInstallments: z.coerce
      .number({ invalid_type_error: "Informe o número de parcelas." })
      .int("O número de parcelas deve ser inteiro.")
      .min(1, "O mínimo é 1 parcela.")
      .max(
        MAX_CREDIT_INSTALLMENTS,
        `O máximo é ${MAX_CREDIT_INSTALLMENTS} parcelas.`,
      ),
  })
  .superRefine((data, ctx) => {
    if (data.method !== PaymentMethod.CREDIT_CARD && data.maxInstallments > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Só o cartão de crédito aceita parcelamento.",
        path: ["maxInstallments"],
      });
    }
  });

export type PaymentMethodConfigInput = z.input<
  typeof paymentMethodConfigSchema
>;
export type PaymentMethodConfigValues = z.output<
  typeof paymentMethodConfigSchema
>;

const CREDITO_E_DEBITO: PaymentMethod[] = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
];

export function centavosDaMascara(mascara: string | null | undefined): number {
  return decimalToCents(brlMaskToDecimal(mascara ?? ""));
}

function valorPositivo(mensagem: string) {
  return z
    .string({ required_error: mensagem })
    .refine((v) => centavosDaMascara(v) > 0, mensagem)
    .transform((v) => brlMaskToDecimal(v));
}

function valorNaoNegativo(mensagem: string) {
  return z
    .string({ required_error: mensagem })
    .refine((v) => v.replace(/\D/g, "") !== "", mensagem)
    .transform((v) => centsToDecimal(centavosDaMascara(v)));
}

const textoOpcional = (max: number, mensagem: string) =>
  z.string().trim().max(max, mensagem).optional().or(z.literal(""));

export const paymentLineSchema = z.object({
  method: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: "Selecione a forma de pagamento." }),
  }),
  amount: valorPositivo("Informe o valor."),
  accountId: z.string().optional().or(z.literal("")),
  installments: z.coerce.number().int().min(1).default(1),
  cardBrand: textoOpcional(30, "A bandeira deve ter no máximo 30 caracteres."),
  nsu: textoOpcional(40, "O NSU deve ter no máximo 40 caracteres."),
  authorizationCode: textoOpcional(
    40,
    "A autorização deve ter no máximo 40 caracteres.",
  ),
});

export type PaymentLineInput = z.input<typeof paymentLineSchema>;

export interface ReceivePaymentContext {
  balanceCents: number;
  maxInstallmentsByMethod: Partial<Record<PaymentMethod, number>>;
  cashSessionOpen: boolean;
}

export function createReceivePaymentSchema(ctx: ReceivePaymentContext) {
  return z
    .object({ lines: z.array(paymentLineSchema).min(1, "Adicione uma forma.") })
    .superRefine((data, issue) => {
      let total = 0;
      data.lines.forEach((line, index) => {
        total += decimalToCents(line.amount);
        const max =
          line.method === PaymentMethod.CREDIT_CARD
            ? (ctx.maxInstallmentsByMethod[line.method] ?? 1)
            : 1;
        if (line.installments > max) {
          issue.addIssue({
            code: z.ZodIssueCode.custom,
            message: `O máximo é ${max} ${max === 1 ? "parcela" : "parcelas"}.`,
            path: ["lines", index, "installments"],
          });
        }
        if (line.method === PaymentMethod.CASH && !ctx.cashSessionOpen) {
          issue.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Abra o caixa para receber em dinheiro.",
            path: ["lines", index, "method"],
          });
        }
        if (line.method !== PaymentMethod.CASH && !line.accountId) {
          issue.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selecione a conta de destino.",
            path: ["lines", index, "accountId"],
          });
        }
      });
      if (total > ctx.balanceCents) {
        issue.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A soma das formas passa do saldo em aberto.",
          path: ["lines"],
        });
      }
    })
    .transform((data) => ({
      lines: data.lines.map((line) => {
        const cartao = CREDITO_E_DEBITO.includes(line.method);
        return {
          method: line.method,
          amount: line.amount,
          ...(line.method !== PaymentMethod.CASH && line.accountId
            ? { accountId: line.accountId }
            : {}),
          ...(line.method === PaymentMethod.CREDIT_CARD
            ? { installments: line.installments }
            : {}),
          ...(cartao && line.cardBrand ? { cardBrand: line.cardBrand } : {}),
          ...(cartao && line.nsu ? { nsu: line.nsu } : {}),
          ...(cartao && line.authorizationCode
            ? { authorizationCode: line.authorizationCode }
            : {}),
        };
      }),
    }));
}

export function createRefundSchema(maxCents: number) {
  return z.object({
    amount: valorPositivo("Informe o valor do estorno.").refine(
      (v) => decimalToCents(v) <= maxCents,
      "O valor passa do que ainda pode ser estornado.",
    ),
    reason: z.nativeEnum(RefundReason, {
      errorMap: () => ({ message: "Selecione o motivo do estorno." }),
    }),
    notes: textoOpcional(
      1000,
      "A observação deve ter no máximo 1000 caracteres.",
    ),
  });
}

export type RefundInput = z.input<ReturnType<typeof createRefundSchema>>;

export const cancelReceivableSchema = z.object({
  reason: z
    .string({ required_error: "Informe o motivo do cancelamento." })
    .trim()
    .min(3, "Informe o motivo do cancelamento.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
});

export const receivableItemSchema = z.object({
  description: z
    .string({ required_error: "Informe a descrição." })
    .trim()
    .min(2, "Informe a descrição.")
    .max(150, "A descrição deve ter no máximo 150 caracteres."),
  executedById: z.string().optional().or(z.literal("")),
  amount: valorPositivo("Informe o valor."),
});

export type ReceivableItemInput = z.input<typeof receivableItemSchema>;

export const newReceivableSchema = z.object({
  patientId: z
    .string({ required_error: "Selecione o paciente." })
    .min(1, "Selecione o paciente."),
  items: z.array(receivableItemSchema).min(1, "Adicione um item."),
});

export type NewReceivableInput = z.input<typeof newReceivableSchema>;

export const openCashSessionSchema = z.object({
  accountId: z
    .string({ required_error: "Selecione o caixa." })
    .min(1, "Selecione o caixa."),
  openingAmount: valorNaoNegativo("Informe o valor de abertura."),
});

export const cashMovementSchema = z.object({
  amount: valorPositivo("Informe o valor."),
  description: z
    .string({ required_error: "Informe a descrição." })
    .trim()
    .min(2, "Informe a descrição.")
    .max(255, "A descrição deve ter no máximo 255 caracteres."),
});

export const LIMITE_DIFERENCA_SEM_JUSTIFICATIVA_CENTAVOS = 5000;
export const LIMITE_DIFERENCA_SEM_ADMINISTRACAO_CENTAVOS = 100000;

export const MENSAGEM_JUSTIFICATIVA_OBRIGATORIA =
  "Diferença acima de R$ 50,00: explique o motivo na justificativa.";
export const MENSAGEM_DIFERENCA_SO_ADMINISTRACAO =
  "Diferença acima de R$ 1.000,00: só quem tem a área Administração pode fechar este caixa.";

export const closeCashSessionSchema = z.object({
  countedAmount: valorNaoNegativo("Informe o valor contado."),
  notes: textoOpcional(1000, "A justificativa deve ter no máximo 1000 caracteres."),
});

export interface CloseCashSessionContext {
  expectedCents: number;
  podeAdministrar: boolean;
}

export function createCloseCashSessionSchema(ctx: CloseCashSessionContext) {
  return closeCashSessionSchema.superRefine((data, issue) => {
    const diferenca = Math.abs(
      decimalToCents(data.countedAmount) - ctx.expectedCents,
    );
    if (
      diferenca > LIMITE_DIFERENCA_SEM_JUSTIFICATIVA_CENTAVOS &&
      !data.notes
    ) {
      issue.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENSAGEM_JUSTIFICATIVA_OBRIGATORIA,
        path: ["notes"],
      });
    }
    if (
      diferenca > LIMITE_DIFERENCA_SEM_ADMINISTRACAO_CENTAVOS &&
      !ctx.podeAdministrar
    ) {
      issue.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENSAGEM_DIFERENCA_SO_ADMINISTRACAO,
        path: ["countedAmount"],
      });
    }
  });
}

export const appointmentChargeSchema = z.object({
  unitAmount: valorNaoNegativo("Informe o valor da consulta."),
});

export type AppointmentChargeInput = z.input<typeof appointmentChargeSchema>;
