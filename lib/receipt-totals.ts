export interface ReceiptTotalsInput {
  billing: { invoiceValue?: number | string | null } | null | undefined;
  receipt:
    | {
        receivedValue?: number | string | null;
        contestedReceivedValue?: number | string | null;
      }
    | null
    | undefined;
}

export interface ReceiptTotals {
  invoiceValue: number;
  totalReceived: number;
  missingValue: number;
  isContested: boolean;
  isContestPending: boolean;
  isContestResolved: boolean;
  hasPartialReceipt: boolean;
}

export function computeReceiptTotals(
  billing: ReceiptTotalsInput["billing"],
  receipt: ReceiptTotalsInput["receipt"],
): ReceiptTotals {
  const invoiceValue = Number(billing?.invoiceValue ?? 0);
  const received = Number(receipt?.receivedValue ?? 0);
  const contestedRaw = receipt?.contestedReceivedValue;
  const isContested = receipt != null && contestedRaw != null;
  const contested = Number(contestedRaw ?? 0);

  const isContestPending = isContested && contested === received;
  const isContestResolved = isContested && contested !== received;

  const totalReceived = !receipt
    ? 0
    : isContestResolved
      ? received + contested
      : received;

  return {
    invoiceValue,
    totalReceived,
    missingValue: Math.max(0, invoiceValue - totalReceived),
    isContested,
    isContestPending,
    isContestResolved,
    hasPartialReceipt:
      invoiceValue > 0 && totalReceived > 0 && totalReceived < invoiceValue,
  };
}
