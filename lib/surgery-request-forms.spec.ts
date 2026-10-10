import { describe, it, expect } from "vitest";
import {
  buildInvoicePayload,
  buildReceiptPayload,
  buildStartAnalysisPayload,
  contestPaymentFormSchema,
  emptyQuotations,
  invoiceFormSchema,
  receiptFormSchema,
  startAnalysisFormSchema,
  summarizeWorkflowFormErrors,
} from "./surgery-request-forms";

function firstErrors(issues: { path: (string | number)[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.join(".");
    if (!(k in errors)) errors[k] = i.message;
  }
  return errors;
}

const valido = {
  protocol: " PROT-1 ",
  sentAt: "2026-03-10",
  value: "R$ 1.500,00",
  notes: "",
  paymentDeadline: "30",
  setAsDefault: true,
};

describe("invoiceFormSchema", () => {
  it("aceita o formulário completo e apara o protocolo", () => {
    const r = invoiceFormSchema.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.protocol).toBe("PROT-1");
  });

  it("lista os obrigatórios vazios", () => {
    const r = invoiceFormSchema.safeParse({
      ...valido,
      protocol: "",
      value: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors: Record<string, string> = {};
      for (const i of r.error.issues) {
        const k = i.path.join(".");
        if (!(k in errors)) errors[k] = i.message;
      }
      expect(summarizeWorkflowFormErrors(errors)).toBe(
        "Preencha: Nº do protocolo, Valor faturado",
      );
    }
  });

  it("recusa valor zerado", () => {
    const r = invoiceFormSchema.safeParse({ ...valido, value: "R$ 0,00" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        summarizeWorkflowFormErrors({ value: r.error.issues[0].message }),
      ).toBe("Informe um valor válido.");
    }
  });
});

describe("buildInvoicePayload", () => {
  it("soma o prazo em dias à data de envio local", () => {
    const parsed = invoiceFormSchema.parse(valido);
    const payload = buildInvoicePayload(parsed);
    expect(payload.invoiceValue).toBe(1500);
    expect(payload.invoiceProtocol).toBe("PROT-1");
    expect(new Date(payload.paymentDeadline!).getDate()).toBe(
      new Date(2026, 3, 9).getDate(),
    );
    expect(payload.setAsDefaultForHealthPlan).toBe(true);
  });

  it("sem prazo, não envia paymentDeadline", () => {
    const parsed = invoiceFormSchema.parse({ ...valido, paymentDeadline: "" });
    expect(buildInvoicePayload(parsed).paymentDeadline).toBeUndefined();
  });
});

describe("startAnalysisFormSchema", () => {
  it("exige nº e data de recebimento", () => {
    const r = startAnalysisFormSchema.safeParse({
      requestNumber: "  ",
      receivedAt: "",
      quotations: emptyQuotations(),
      notes: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(summarizeWorkflowFormErrors(firstErrors(r.error.issues))).toBe(
        "Preencha: Nº da solicitação, Data de recebimento",
      );
    }
  });

  it("monta o payload só com as cotações preenchidas, na posição de origem", () => {
    const quotations = emptyQuotations();
    quotations[0] = { number: "", receivedAt: "2026-01-01" };
    quotations[2] = { number: " Q3 ", receivedAt: "2026-01-03" };
    const parsed = startAnalysisFormSchema.parse({
      requestNumber: " R-1 ",
      receivedAt: "2026-01-05",
      quotations,
      notes: "  ",
    });
    expect(buildStartAnalysisPayload(parsed)).toEqual({
      requestNumber: "R-1",
      receivedAt: "2026-01-05",
      notes: undefined,
      quotation3Number: "Q3",
      quotation3ReceivedAt: "2026-01-03",
    });
  });
});

describe("receiptFormSchema", () => {
  it("aceita valor zero (recebimento integralmente glosado)", () => {
    expect(
      receiptFormSchema.safeParse({
        receivedValue: "R$ 0,00",
        receivedAt: "2026-02-01",
        receiptNotes: "",
      }).success,
    ).toBe(true);
  });

  it("valor vazio vira \"Preencha: Valor recebido\"", () => {
    const r = receiptFormSchema.safeParse({
      receivedValue: "",
      receivedAt: "2026-02-01",
      receiptNotes: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(summarizeWorkflowFormErrors(firstErrors(r.error.issues))).toBe(
        "Preencha: Valor recebido",
      );
    }
  });

  it("a data do recebimento vai como meia-noite local, não UTC", () => {
    const payload = buildReceiptPayload(
      receiptFormSchema.parse({
        receivedValue: "R$ 1.234,50",
        receivedAt: "2026-02-01",
        receiptNotes: " ok ",
      }),
    );
    expect(payload.receivedValue).toBe(1234.5);
    expect(new Date(payload.receivedAt).getDate()).toBe(1);
    expect(payload.receiptNotes).toBe("ok");
  });
});

describe("contestPaymentFormSchema", () => {
  it("lista destinatários, assunto e mensagem faltantes", () => {
    const r = contestPaymentFormSchema.safeParse({
      to: [],
      subject: " ",
      message: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(summarizeWorkflowFormErrors(firstErrors(r.error.issues))).toBe(
        "Preencha: Destinatários, Assunto, Mensagem",
      );
    }
  });
});
