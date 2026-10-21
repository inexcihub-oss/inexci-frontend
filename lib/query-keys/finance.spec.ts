import { describe, it, expect } from "vitest";
import { financeKeys } from "./index";

describe("financeKeys", () => {
  it("tudo vive sob ['finance']", () => {
    for (const key of [
      financeKeys.accountList(true),
      financeKeys.paymentMethods(),
      financeKeys.receivableList({ page: 1 }),
      financeKeys.receivable("r1"),
      financeKeys.paymentList(),
      financeKeys.patientSummary("p1"),
      financeKeys.appointmentStatus(["a"]),
      financeKeys.currentCashSession(),
      financeKeys.servicePrices(),
      financeKeys.receiptsReport({ from: "a", to: "b", groupBy: "day" }),
    ]) {
      expect(key[0]).toBe("finance");
    }
  });

  it("detalhe e lista ficam sob o prefixo do domínio (invalidação em cascata)", () => {
    expect(financeKeys.receivable("r1").slice(0, 2)).toEqual(
      financeKeys.receivables(),
    );
    expect(financeKeys.accountList(false).slice(0, 2)).toEqual(
      financeKeys.accounts(),
    );
    expect(financeKeys.currentCashSession().slice(0, 2)).toEqual(
      financeKeys.cash(),
    );
    expect(financeKeys.patientSummary("p1").slice(0, 2)).toEqual(
      financeKeys.patientSummaries(),
    );
  });

  it("o status da agenda não depende da ordem dos ids", () => {
    expect(financeKeys.appointmentStatus(["b", "a"])).toEqual(
      financeKeys.appointmentStatus(["a", "b"]),
    );
  });
});
