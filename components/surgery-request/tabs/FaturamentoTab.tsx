"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ConfirmReceiptModal } from "@/components/surgery-request/modals/ConfirmReceiptModal";
import { useSolicitacao } from "@/contexts/SolicitacaoContext";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Interpreta string de data YYYY-MM-DD como horário local (não UTC)
function parseDate(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return parseDate(dateStr).toLocaleDateString("pt-BR");
}

function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = parseDate(dateStr);
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}`;
}

function safeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Se já é YYYY-MM-DD, retorna como está (sem converter para UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Aba "Faturamento" — disponível a partir do status 7 (Faturada).
 *
 * Design: Figma node 1-1800
 */
export function FaturamentoTab() {
  const { solicitacao, onUpdate } = useSolicitacao();
  const [isConfirmReceiptOpen, setIsConfirmReceiptOpen] = useState(false);

  const billing = solicitacao?.billing;
  const receipt = solicitacao?.receipt;

  if (!billing) {
    return (
      <div className="px-4 py-12 text-center text-gray-500 text-xs md:text-sm border border-neutral-100 rounded-xl">
        Nenhum dado de faturamento registrado
      </div>
    );
  }

  const expectedDateStr = safeDate(billing.paymentDeadline);

  // Contestação pendente: divergente mas ainda não resolvida
  const isContestPending =
    receipt?.isContested &&
    receipt.contestedReceivedValue === receipt.receivedValue;

  // Contestação resolvida: segundo pagamento já foi registrado
  const isContestResolved =
    receipt?.isContested &&
    receipt.contestedReceivedValue !== receipt.receivedValue;

  const invoiceValue = Number(billing.invoiceValue ?? 0);
  const totalReceived = (() => {
    if (!receipt) return 0;

    if (isContestResolved) {
      return (
        Number(receipt.contestedReceivedValue ?? 0) +
        Number(receipt.receivedValue ?? 0)
      );
    }

    return Number(receipt.receivedValue ?? 0);
  })();

  const hasPartialReceipt =
    invoiceValue > 0 && totalReceived > 0 && totalReceived < invoiceValue;

  const missingValue = Math.max(0, invoiceValue - totalReceived);

  return (
    <div className="flex flex-col gap-3">
      {hasPartialReceipt && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs md:text-sm font-semibold text-amber-800">
              Recebimento parcial identificado
            </span>
            <span className="text-xs text-amber-700">
              Recebido {formatCurrency(totalReceived)} de{" "}
              {formatCurrency(invoiceValue)} · Falta{" "}
              {formatCurrency(missingValue)}
            </span>
          </div>
        </div>
      )}

      {/* ── Seção Recebimento (status 8+) — aparece primeiro quando disponível ── */}
      {receipt && (
        <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
            <span className="ds-section-title">Recebimento</span>
            <div className="flex items-center gap-2">
              {isContestPending && (
                <>
                  <span className="inline-flex items-center h-6 px-2 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Contestado
                  </span>
                  <button
                    onClick={() => setIsConfirmReceiptOpen(true)}
                    className="ds-btn-inline"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grade: 4 colunas quando resolvido, 2 quando normal */}
          {isContestResolved ? (
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
                <span className="text-xs md:text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(
                    receipt.contestedReceivedAt ?? receipt.receivedAt,
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-xs md:text-sm text-gray-500">
                  Valor recebido
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.contestedReceivedValue ?? 0)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-t sm:border-t-0 sm:border-l border-gray-200">
                <span className="text-xs md:text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(receipt.receivedAt)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-xs md:text-sm text-gray-500">
                  Valor recebido
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.receivedValue)}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
                <span className="text-xs md:text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(receipt.receivedAt)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-t sm:border-t-0 sm:border-l border-gray-200">
                <span className="text-xs md:text-sm text-gray-500">
                  Valor recebido
                </span>
                <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.receivedValue)}
                </span>
              </div>
            </div>
          )}

          {receipt.receiptNotes && (
            <div className="flex flex-col gap-1 p-4 border-t border-gray-200">
              <label className="ds-label mb-0">Observações</label>
              <div className="ds-field-readonly">{receipt.receiptNotes}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Seção Faturamento ── */}
      <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
          <span className="ds-section-title">Faturamento</span>
          {!receipt && <button className="ds-btn-inline">Editar</button>}
        </div>

        {/* Data prevista + Valor */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
            <span className="text-xs md:text-sm text-gray-500">
              Data prevista
            </span>
            <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
              {expectedDateStr ? formatDateDisplay(expectedDateStr) : "—"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-t sm:border-t-0 sm:border-l border-gray-200">
            <span className="text-xs md:text-sm text-gray-500">Valor</span>
            <span className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
              {billing.invoiceValue != null
                ? formatCurrency(billing.invoiceValue)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Seção Dados do faturamento ── */}
      <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 h-12 border-b border-gray-200">
          <span className="ds-section-title">Dados do faturamento</span>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4">
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">
              Nº do protocolo de faturamento
            </label>
            <div className="ds-field-readonly">
              {billing.invoiceProtocol ?? "—"}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">Envio do faturamento</label>
            <div className="ds-field-readonly">
              {formatDate(billing.invoiceSentAt)}
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="ds-label mb-0">Observação</label>
            <div className="ds-field-readonly whitespace-pre-wrap break-words">
              {billing.invoiceNotes?.trim() ? billing.invoiceNotes : "—"}
            </div>
          </div>
        </div>
      </div>

      <ConfirmReceiptModal
        isOpen={isConfirmReceiptOpen}
        onClose={() => setIsConfirmReceiptOpen(false)}
        solicitacao={solicitacao}
        isEditMode
        initialReceivedValue={
          billing?.invoiceValue != null &&
          receipt?.contestedReceivedValue != null
            ? Math.max(0, billing.invoiceValue - receipt.contestedReceivedValue)
            : undefined
        }
        onSuccess={() => {
          onUpdate();
          setIsConfirmReceiptOpen(false);
        }}
      />
    </div>
  );
}
