import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { financeService } from "./finance.service";
import { PaymentMethod, RefundReason } from "@/types/finance.types";

const get = api.get as ReturnType<typeof vi.fn>;
const post = api.post as ReturnType<typeof vi.fn>;
const patch = api.patch as ReturnType<typeof vi.fn>;
const put = api.put as ReturnType<typeof vi.fn>;
const del = api.delete as ReturnType<typeof vi.fn>;

describe("financeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: "ok" });
    post.mockResolvedValue({ data: "ok" });
    patch.mockResolvedValue({ data: "ok" });
    put.mockResolvedValue({ data: "ok" });
    del.mockResolvedValue({ data: "ok" });
  });

  it("lista contas pedindo as inativas só quando solicitado", async () => {
    await financeService.listAccounts();
    expect(get).toHaveBeenLastCalledWith("/finance/accounts", {
      params: undefined,
    });
    await financeService.listAccounts(true);
    expect(get).toHaveBeenLastCalledWith("/finance/accounts", {
      params: { includeInactive: true },
    });
  });

  it("ativa e desativa conta pela rota de status", async () => {
    await financeService.setAccountStatus("a1", false);
    expect(patch).toHaveBeenCalledWith("/finance/accounts/a1/status", {
      active: false,
    });
  });

  it("atualiza a forma de pagamento com PUT", async () => {
    const payload = {
      active: true,
      defaultAccountId: "a1",
      maxInstallments: 6,
    };
    await financeService.updatePaymentMethod(PaymentMethod.CREDIT_CARD, payload);
    expect(put).toHaveBeenCalledWith(
      "/finance/payment-methods/credit_card",
      payload,
    );
  });

  it("filtra a lista de cobranças sem mandar parâmetros vazios", async () => {
    await financeService.listReceivables({ status: undefined, from: "", page: 2 });
    expect(get).toHaveBeenCalledWith("/finance/receivables", {
      params: { page: 2 },
    });
  });

  it("embrulha o item ao adicioná-lo à cobrança", async () => {
    const item = { description: "Consulta", unitAmount: "300.00" };
    await financeService.addReceivableItem("r1", item);
    expect(post).toHaveBeenCalledWith("/finance/receivables/r1/items", {
      item,
    });
  });

  it("cancela item com DELETE", async () => {
    await financeService.cancelReceivableItem("r1", "i1");
    expect(del).toHaveBeenCalledWith("/finance/receivables/r1/items/i1");
  });

  it("estorna pelo pagamento", async () => {
    await financeService.refundPayment("p1", {
      amount: "10.00",
      reason: RefundReason.WRONG_AMOUNT,
    });
    expect(post).toHaveBeenCalledWith("/finance/payments/p1/refunds", {
      amount: "10.00",
      reason: "wrong_amount",
    });
  });

  it("consulta o status das consultas em uma chamada e pula lista vazia", async () => {
    expect(await financeService.getAppointmentsStatus([])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
    await financeService.getAppointmentsStatus(["a", "b"]);
    expect(get).toHaveBeenCalledWith("/finance/appointments/status", {
      params: { ids: "a,b" },
    });
  });

  it("exporta relatório como CSV em blob", async () => {
    await financeService.exportReceiptsReportCsv({
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "method",
    });
    expect(get).toHaveBeenCalledWith("/finance/reports/receipts", {
      params: {
        from: "2026-10-01",
        to: "2026-10-31",
        groupBy: "method",
        format: "csv",
      },
      responseType: "blob",
    });
  });

  it("baixa o recibo em PDF como blob e a prévia como HTML", async () => {
    await financeService.getPaymentReceiptPdf("p1");
    expect(get).toHaveBeenLastCalledWith("/finance/payments/p1/receipt", {
      responseType: "blob",
    });
    get.mockResolvedValueOnce({ data: { html: "<p>recibo</p>" } });
    expect(await financeService.getPaymentReceiptPreview("p1")).toBe(
      "<p>recibo</p>",
    );
  });

  it("fecha o caixa de outro usuário pela rota por id", async () => {
    await financeService.closeCashSession("c1", { countedAmount: "100.00" });
    expect(post).toHaveBeenCalledWith("/finance/cash-sessions/c1/close", {
      countedAmount: "100.00",
    });
  });
});
