import { describe, it, expect } from "vitest";
import { computeReceiptTotals } from "./receipt-totals";

describe("computeReceiptTotals", () => {
  it("sem recebimento: nada recebido, nada parcial", () => {
    const r = computeReceiptTotals({ invoiceValue: 1000 }, null);
    expect(r.totalReceived).toBe(0);
    expect(r.missingValue).toBe(1000);
    expect(r.hasPartialReceipt).toBe(false);
    expect(r.isContested).toBe(false);
  });

  it("recebimento integral, sem divergência", () => {
    const r = computeReceiptTotals(
      { invoiceValue: 1000 },
      { receivedValue: 1000, contestedReceivedValue: null },
    );
    expect(r.totalReceived).toBe(1000);
    expect(r.hasPartialReceipt).toBe(false);
    expect(r.isContestPending).toBe(false);
    expect(r.isContestResolved).toBe(false);
  });

  it("divergência em aberto: recebido == contestado, total é o recebido", () => {
    const r = computeReceiptTotals(
      { invoiceValue: 1000 },
      { receivedValue: 600, contestedReceivedValue: 600 },
    );
    expect(r.isContestPending).toBe(true);
    expect(r.isContestResolved).toBe(false);
    expect(r.totalReceived).toBe(600);
    expect(r.missingValue).toBe(400);
    expect(r.hasPartialReceipt).toBe(true);
  });

  it("divergência resolvida: soma o primeiro recebimento e o complemento", () => {
    const r = computeReceiptTotals(
      { invoiceValue: 1000 },
      { receivedValue: 400, contestedReceivedValue: 600 },
    );
    expect(r.isContestResolved).toBe(true);
    expect(r.totalReceived).toBe(1000);
    expect(r.hasPartialReceipt).toBe(false);
  });

  it("contestedReceivedValue nulo NÃO é divergência resolvida (regra unificada)", () => {
    const r = computeReceiptTotals(
      { invoiceValue: 1000 },
      { receivedValue: 300, contestedReceivedValue: null },
    );
    expect(r.isContested).toBe(false);
    expect(r.isContestResolved).toBe(false);
    expect(r.totalReceived).toBe(300);
    expect(r.hasPartialReceipt).toBe(true);
  });

  it("aceita valores numéricos vindos como string (decimal do Postgres)", () => {
    const r = computeReceiptTotals(
      { invoiceValue: "1000.00" },
      { receivedValue: "250.50", contestedReceivedValue: "250.50" },
    );
    expect(r.totalReceived).toBeCloseTo(250.5);
    expect(r.isContestPending).toBe(true);
  });
});
