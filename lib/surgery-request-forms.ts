import { z } from "zod";
import { parseBRLValue } from "@/lib/currency";
import type { StartAnalysisPayload } from "@/services/surgery-request.service";

export const INVALID_AMOUNT_MESSAGE = "Informe um valor válido.";

function brlAmount(requiredLabel: string) {
  return z
    .string()
    .trim()
    .min(1, requiredLabel)
    .refine((v) => {
      const n = parseBRLValue(v);
      return !Number.isNaN(n) && n > 0;
    }, INVALID_AMOUNT_MESSAGE);
}

export const invoiceFormSchema = z.object({
  protocol: z.string().trim().min(1, "Nº do protocolo"),
  sentAt: z.string().min(1, "Data de envio"),
  value: brlAmount("Valor faturado"),
  notes: z.string(),
  paymentDeadline: z.string(),
  setAsDefault: z.boolean(),
});

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;

export function summarizeWorkflowFormErrors(
  errors: Record<string, string>,
): string {
  const messages = Object.values(errors);
  const missing = messages.filter((m) => m !== INVALID_AMOUNT_MESSAGE);
  if (missing.length > 0) return `Preencha: ${missing.join(", ")}`;
  return messages[0] ?? INVALID_AMOUNT_MESSAGE;
}

export function buildInvoicePayload(values: z.output<typeof invoiceFormSchema>) {
  const [sy, sm, sd] = values.sentAt.split("-").map(Number);
  const sentAtDate = new Date(sy, sm - 1, sd);

  let paymentDeadlineISO: string | undefined;
  if (values.paymentDeadline) {
    const deadline = new Date(sy, sm - 1, sd);
    deadline.setDate(deadline.getDate() + parseInt(values.paymentDeadline, 10));
    paymentDeadlineISO = deadline.toISOString();
  }

  return {
    invoiceProtocol: values.protocol,
    invoiceValue: parseBRLValue(values.value),
    invoiceSentAt: sentAtDate.toISOString(),
    invoiceNotes: values.notes.trim() || undefined,
    paymentDeadline: paymentDeadlineISO,
    setAsDefaultForHealthPlan: values.setAsDefault || undefined,
  };
}

const QUOTATION_PAYLOAD_KEYS = [
  ["quotation1Number", "quotation1ReceivedAt"],
  ["quotation2Number", "quotation2ReceivedAt"],
  ["quotation3Number", "quotation3ReceivedAt"],
] as const satisfies ReadonlyArray<
  readonly [keyof StartAnalysisPayload, keyof StartAnalysisPayload]
>;

export const QUOTATION_SLOTS = QUOTATION_PAYLOAD_KEYS.length;

const quotationSchema = z.object({
  number: z.string().trim(),
  receivedAt: z.string(),
});

export const startAnalysisFormSchema = z.object({
  requestNumber: z.string().trim().min(1, "Nº da solicitação"),
  receivedAt: z.string().min(1, "Data de recebimento"),
  quotations: z.array(quotationSchema).max(QUOTATION_SLOTS),
  notes: z.string(),
});

export type StartAnalysisFormValues = z.input<typeof startAnalysisFormSchema>;

export function emptyQuotations(): StartAnalysisFormValues["quotations"] {
  return Array.from({ length: QUOTATION_SLOTS }, () => ({
    number: "",
    receivedAt: "",
  }));
}

export function buildStartAnalysisPayload(
  values: z.output<typeof startAnalysisFormSchema>,
): StartAnalysisPayload {
  const payload: StartAnalysisPayload = {
    requestNumber: values.requestNumber,
    receivedAt: values.receivedAt,
    notes: values.notes.trim() || undefined,
  };
  values.quotations.forEach((quotation, index) => {
    const keys = QUOTATION_PAYLOAD_KEYS[index];
    if (!keys || !quotation.number) return;
    const [numberKey, receivedAtKey] = keys;
    payload[numberKey] = quotation.number;
    if (quotation.receivedAt) payload[receivedAtKey] = quotation.receivedAt;
  });
  return payload;
}

export const receiptFormSchema = z.object({
  receivedValue: z
    .string()
    .trim()
    .min(1, "Valor recebido")
    .refine((v) => {
      const n = parseBRLValue(v);
      return !Number.isNaN(n) && n >= 0;
    }, "Valor recebido"),
  receivedAt: z.string().min(1, "Data do recebimento"),
  receiptNotes: z.string(),
});

export type ReceiptFormValues = z.input<typeof receiptFormSchema>;

export function buildReceiptPayload(
  values: z.output<typeof receiptFormSchema>,
) {
  const [y, m, d] = values.receivedAt.split("-").map(Number);
  return {
    receivedValue: parseBRLValue(values.receivedValue),
    receivedAt: new Date(y, m - 1, d).toISOString(),
    receiptNotes: values.receiptNotes.trim() || undefined,
  };
}

export const contestPaymentFormSchema = z.object({
  to: z.array(z.string()).min(1, "Destinatários"),
  subject: z.string().trim().min(1, "Assunto"),
  message: z.string().trim().min(1, "Mensagem"),
});

export type ContestPaymentFormValues = z.input<typeof contestPaymentFormSchema>;
