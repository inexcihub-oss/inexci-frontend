import { describe, it, expect } from "vitest";
import {
  appointmentChargeSchema,
  cancelReceivableSchema,
  cashMovementSchema,
  closeCashSessionSchema,
  createCloseCashSessionSchema,
  createReceivePaymentSchema,
  createRefundSchema,
  financialAccountSchema,
  openCashSessionSchema,
  paymentLineSchema,
  paymentMethodConfigSchema,
  receivableItemSchema,
} from "./finance";
import { servicePriceSchema } from "./service-price";
import {
  FinancialAccountType,
  PaymentMethod,
  RefundReason,
} from "@/types/finance.types";

describe("financialAccountSchema", () => {
  it("aceita conta com nome e tipo", () => {
    expect(
      financialAccountSchema.safeParse({
        name: " Caixa Físico ",
        type: FinancialAccountType.CASH_DRAWER,
        notes: "",
      }),
    ).toMatchObject({ success: true, data: { name: "Caixa Físico" } });
  });

  it("exige o nome", () => {
    const r = financialAccountSchema.safeParse({
      name: " ",
      type: FinancialAccountType.BANK,
    });
    expect(r.success).toBe(false);
  });

  it("recusa tipo desconhecido", () => {
    const r = financialAccountSchema.safeParse({ name: "Cora", type: "xpto" });
    expect(r.success).toBe(false);
  });
});

describe("paymentMethodConfigSchema", () => {
  const base = { active: true, defaultAccountId: null };

  it("aceita crédito parcelado até 24x", () => {
    expect(
      paymentMethodConfigSchema.safeParse({
        ...base,
        method: PaymentMethod.CREDIT_CARD,
        maxInstallments: 24,
      }).success,
    ).toBe(true);
  });

  it("recusa mais de 24 parcelas e menos de 1", () => {
    for (const maxInstallments of [25, 0]) {
      expect(
        paymentMethodConfigSchema.safeParse({
          ...base,
          method: PaymentMethod.CREDIT_CARD,
          maxInstallments,
        }).success,
      ).toBe(false);
    }
  });

  it("recusa parcelamento fora do crédito", () => {
    const r = paymentMethodConfigSchema.safeParse({
      ...base,
      method: PaymentMethod.DEBIT_CARD,
      maxInstallments: 2,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe(
        "Só o cartão de crédito aceita parcelamento.",
      );
    }
  });
});

describe("createReceivePaymentSchema", () => {
  const ctx = {
    balanceCents: 20000,
    maxInstallmentsByMethod: { [PaymentMethod.CREDIT_CARD]: 3 },
    cashSessionOpen: true,
  };
  const linha = (patch: Record<string, unknown> = {}) => ({
    method: PaymentMethod.PIX,
    amount: "R$ 100,00",
    accountId: "acc-1",
    installments: 1,
    cardBrand: "",
    nsu: "",
    authorizationCode: "",
    ...patch,
  });

  it("converte o pagamento dividido em linhas com valor decimal", () => {
    const r = createReceivePaymentSchema(ctx).safeParse({
      lines: [
        linha(),
        linha({
          method: PaymentMethod.CREDIT_CARD,
          installments: "3",
          cardBrand: "Visa",
          nsu: "123",
        }),
      ],
    });
    expect(r).toMatchObject({
      success: true,
      data: {
        lines: [
          { method: "pix", amount: "100.00", accountId: "acc-1" },
          {
            method: "credit_card",
            amount: "100.00",
            accountId: "acc-1",
            installments: 3,
            cardBrand: "Visa",
            nsu: "123",
          },
        ],
      },
    });
  });

  it("recusa parcelas acima do máximo da forma", () => {
    const r = createReceivePaymentSchema(ctx).safeParse({
      lines: [linha({ method: PaymentMethod.CREDIT_CARD, installments: 4 })],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({
      path: ["lines", 0, "installments"],
      message: "O máximo é 3 parcelas.",
    });
  });

  it("recusa soma acima do saldo, sem float", () => {
    const r = createReceivePaymentSchema(ctx).safeParse({
      lines: [linha({ amount: "R$ 100,01" }), linha()],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(
      "A soma das formas passa do saldo em aberto.",
    );
  });

  it("dinheiro exige caixa aberto e não manda conta", () => {
    const fechado = createReceivePaymentSchema({ ...ctx, cashSessionOpen: false });
    expect(
      fechado.safeParse({ lines: [linha({ method: PaymentMethod.CASH })] })
        .error?.issues[0].message,
    ).toBe("Abra o caixa para receber em dinheiro.");
    expect(
      createReceivePaymentSchema(ctx).parse({
        lines: [linha({ method: PaymentMethod.CASH })],
      }).lines[0],
    ).toEqual({ method: "cash", amount: "100.00" });
  });

  it("forma que não é dinheiro exige conta de destino", () => {
    const r = createReceivePaymentSchema(ctx).safeParse({
      lines: [linha({ accountId: "" })],
    });
    expect(r.error?.issues[0].message).toBe("Selecione a conta de destino.");
  });
});

describe("createRefundSchema", () => {
  it("limita o estorno ao que ainda pode ser estornado", () => {
    const schema = createRefundSchema(5000);
    expect(
      schema.safeParse({ amount: "R$ 50,01", reason: RefundReason.OTHER })
        .success,
    ).toBe(false);
    expect(
      schema.parse({ amount: "R$ 50,00", reason: RefundReason.OTHER }),
    ).toMatchObject({ amount: "50.00", reason: "other" });
  });

  it("exige o motivo", () => {
    const r = createRefundSchema(5000).safeParse({ amount: "R$ 1,00", reason: "" });
    expect(r.error?.issues[0].message).toBe("Selecione o motivo do estorno.");
  });
});

describe("caixa", () => {
  it("aceita abertura com zero", () => {
    expect(
      openCashSessionSchema.parse({ accountId: "c-1", openingAmount: "R$ 0,00" }),
    ).toEqual({ accountId: "c-1", openingAmount: "0.00" });
  });

  it("exige o valor contado no fechamento", () => {
    expect(
      closeCashSessionSchema.safeParse({ countedAmount: "" }).success,
    ).toBe(false);
    expect(
      closeCashSessionSchema.parse({ countedAmount: "R$ 1.234,50" }),
    ).toMatchObject({ countedAmount: "1234.50" });
  });

  it("retirada exige valor positivo e descrição", () => {
    expect(
      cashMovementSchema.safeParse({ amount: "R$ 0,00", description: "x" })
        .success,
    ).toBe(false);
  });
});

describe("limites alinhados aos DTOs da API", () => {
  const texto = (n: number) => "x".repeat(n);
  const aceita = (r: { success: boolean }) => expect(r.success).toBe(true);
  const recusa = (r: { success: boolean }) => expect(r.success).toBe(false);

  it("nome da conta até 80 e observações até 1000", () => {
    const base = { type: FinancialAccountType.BANK };
    aceita(financialAccountSchema.safeParse({ ...base, name: texto(80) }));
    recusa(financialAccountSchema.safeParse({ ...base, name: texto(81) }));
    aceita(
      financialAccountSchema.safeParse({
        ...base,
        name: "Cora",
        notes: texto(1000),
      }),
    );
    recusa(
      financialAccountSchema.safeParse({
        ...base,
        name: "Cora",
        notes: texto(1001),
      }),
    );
  });

  it("NSU e autorização até 40, bandeira até 30", () => {
    const linha = {
      method: PaymentMethod.CREDIT_CARD,
      amount: "R$ 10,00",
      accountId: "acc-1",
      installments: 1,
    };
    aceita(
      paymentLineSchema.safeParse({
        ...linha,
        nsu: texto(40),
        authorizationCode: texto(40),
        cardBrand: texto(30),
      }),
    );
    recusa(paymentLineSchema.safeParse({ ...linha, nsu: texto(41) }));
    recusa(
      paymentLineSchema.safeParse({ ...linha, authorizationCode: texto(41) }),
    );
    recusa(paymentLineSchema.safeParse({ ...linha, cardBrand: texto(31) }));
  });

  it("descrição do item da cobrança e do preço até 150", () => {
    const item = { amount: "R$ 10,00", executedById: "" };
    aceita(receivableItemSchema.safeParse({ ...item, description: texto(150) }));
    recusa(receivableItemSchema.safeParse({ ...item, description: texto(151) }));
    const preco = {
      doctorId: "",
      appointmentType: "",
      amount: "R$ 10,00",
      active: true,
    };
    aceita(servicePriceSchema.safeParse({ ...preco, description: texto(150) }));
    recusa(servicePriceSchema.safeParse({ ...preco, description: texto(151) }));
  });

  it("motivo do cancelamento até 500 e observação do estorno até 1000", () => {
    aceita(cancelReceivableSchema.safeParse({ reason: texto(500) }));
    recusa(cancelReceivableSchema.safeParse({ reason: texto(501) }));
    const estorno = createRefundSchema(10000);
    const base = { amount: "R$ 10,00", reason: RefundReason.OTHER };
    aceita(estorno.safeParse({ ...base, notes: texto(1000) }));
    recusa(estorno.safeParse({ ...base, notes: texto(1001) }));
  });

  it("descrição do movimento de caixa até 255 e justificativa do fechamento até 1000", () => {
    aceita(
      cashMovementSchema.safeParse({ amount: "R$ 1,00", description: texto(255) }),
    );
    recusa(
      cashMovementSchema.safeParse({ amount: "R$ 1,00", description: texto(256) }),
    );
    aceita(
      closeCashSessionSchema.safeParse({
        countedAmount: "R$ 1,00",
        notes: texto(1000),
      }),
    );
    recusa(
      closeCashSessionSchema.safeParse({
        countedAmount: "R$ 1,00",
        notes: texto(1001),
      }),
    );
  });
});

describe("createCloseCashSessionSchema", () => {
  const esperado = 10000;

  it("diferença de até R$ 50,00 dispensa justificativa", () => {
    const schema = createCloseCashSessionSchema({
      expectedCents: esperado,
      podeAdministrar: false,
    });
    expect(schema.safeParse({ countedAmount: "R$ 150,00" }).success).toBe(true);
    expect(schema.safeParse({ countedAmount: "R$ 50,00" }).success).toBe(true);
  });

  it("diferença acima de R$ 50,00 exige justificativa, para mais ou para menos", () => {
    const schema = createCloseCashSessionSchema({
      expectedCents: esperado,
      podeAdministrar: false,
    });
    for (const countedAmount of ["R$ 150,01", "R$ 49,99"]) {
      const r = schema.safeParse({ countedAmount, notes: "  " });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]).toMatchObject({ path: ["notes"] });
      expect(
        schema.safeParse({ countedAmount, notes: "Troco" }).success,
      ).toBe(true);
    }
  });

  it("diferença acima de R$ 1.000,00 só fecha com a área Administração", () => {
    const valores = { countedAmount: "R$ 1.100,01", notes: "Depósito" };
    const semAdmin = createCloseCashSessionSchema({
      expectedCents: esperado,
      podeAdministrar: false,
    }).safeParse(valores);
    expect(semAdmin.success).toBe(false);
    expect(semAdmin.error?.issues[0]).toMatchObject({
      path: ["countedAmount"],
    });
    expect(
      createCloseCashSessionSchema({
        expectedCents: esperado,
        podeAdministrar: true,
      }).safeParse(valores).success,
    ).toBe(true);
  });
});

describe("appointmentChargeSchema", () => {
  it("exige o valor e converte para decimal", () => {
    expect(appointmentChargeSchema.safeParse({ unitAmount: "" }).success).toBe(
      false,
    );
    expect(appointmentChargeSchema.parse({ unitAmount: "R$ 300,00" })).toEqual({
      unitAmount: "300.00",
    });
  });
});
