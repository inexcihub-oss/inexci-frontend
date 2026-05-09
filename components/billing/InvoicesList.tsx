"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  formatDateBR,
  formatPriceCents,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/billing-format";
import type { Invoice } from "@/types";
import { ExternalLink, Receipt } from "lucide-react";

interface Props {
  invoices: Invoice[];
  loading: boolean;
}

const TONE_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

export function InvoicesList({ invoices, loading }: Props) {
  return (
    <Card className="border border-gray-200 rounded-2xl">
      <CardHeader className="p-6 pb-4">
        <h3 className="text-base font-semibold text-gray-900">Faturas</h3>
        <p className="text-sm text-gray-500">
          Histórico das cobranças geradas pela sua assinatura.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-gray-500 px-6 py-6">
            Carregando faturas...
          </p>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Nenhuma fatura emitida até o momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Período</th>
                  <th className="text-left px-6 py-3 font-medium">Valor</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">
                    Vencimento
                  </th>
                  <th className="text-left px-6 py-3 font-medium">Pago em</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const tone = INVOICE_STATUS_TONE[invoice.status];
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-gray-700">
                        <span className="font-medium text-gray-900">
                          {invoice.planSnapshot?.name ?? "Assinatura"}
                        </span>
                        <br />
                        <span className="text-xs text-gray-500">
                          {formatDateBR(invoice.periodStart)} —{" "}
                          {formatDateBR(invoice.periodEnd)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-900 font-medium">
                        {formatPriceCents(invoice.amountCents, invoice.currency)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                            TONE_STYLES[tone] ?? TONE_STYLES.neutral,
                          )}
                        >
                          {INVOICE_STATUS_LABEL[invoice.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {formatDateBR(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {formatDateBR(invoice.paidAt)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {invoice.invoiceUrl ? (
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium"
                          >
                            2ª via
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
