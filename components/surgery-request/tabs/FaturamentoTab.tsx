"use client";

import React, { useState } from "react";
import { ConfirmReceiptModal } from "@/components/surgery-request/modals/ConfirmReceiptModal";

interface FaturamentoTabProps {
  solicitacao: any;
  onUpdate: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
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
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Aba "Faturamento" — disponível a partir do status 7 (Faturada).
 *
 * Design: Figma node 1-1800
 */
export function FaturamentoTab({ solicitacao, onUpdate }: FaturamentoTabProps) {
  const [isConfirmReceiptOpen, setIsConfirmReceiptOpen] = useState(false);

  const billing = solicitacao?.billing;
  const receipt = solicitacao?.receipt;

  if (!billing) {
    return (
      <div className="px-4 py-12 text-center text-gray-500 text-sm border border-neutral-100 rounded-lg">
        Nenhum dado de faturamento registrado
      </div>
    );
  }

  const expectedDateStr = safeDate(billing.payment_deadline);

  // Contestação pendente: divergente mas ainda não resolvida
  const isContestPending =
    receipt?.is_contested &&
    receipt.contested_received_value === receipt.received_value;

  // Contestação resolvida: segundo pagamento já foi registrado
  const isContestResolved =
    receipt?.is_contested &&
    receipt.contested_received_value !== receipt.received_value;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Seção Recebimento (status 8+) — aparece primeiro quando disponível ── */}
      {receipt && (
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-900">
              Recebimento
            </span>
            <div className="flex items-center gap-2">
              {isContestPending && (
                <>
                  <span className="inline-flex items-center h-6 px-2 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Contestado
                  </span>
                  <button
                    onClick={() => setIsConfirmReceiptOpen(true)}
                    className="px-3 py-1.5 text-sm font-semibold text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grade: 4 colunas quando resolvido, 2 quando normal */}
          {isContestResolved ? (
            <div className="grid grid-cols-4">
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
                <span className="text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(
                    receipt.contested_received_at ?? receipt.received_at,
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-sm text-gray-500">Valor recebido</span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.contested_received_value ?? 0)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(receipt.received_at)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-sm text-gray-500">Valor recebido</span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.received_value)}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2">
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
                <span className="text-sm text-gray-500">
                  Data do recebimento
                </span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatDateDisplay(receipt.received_at)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
                <span className="text-sm text-gray-500">Valor recebido</span>
                <span className="text-3xl font-light tracking-tight text-gray-900">
                  {formatCurrency(receipt.received_value)}
                </span>
              </div>
            </div>
          )}

          {receipt.receipt_notes && (
            <div className="flex flex-col gap-1 p-4 border-t border-gray-200">
              <label className="text-sm font-semibold text-black">
                Observações
              </label>
              <div className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg">
                {receipt.receipt_notes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Seção Faturamento ── */}
      <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">
            Faturamento
          </span>
          {!receipt && (
            <button className="px-3 py-1.5 text-sm font-semibold text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              Editar
            </button>
          )}
        </div>

        {/* Data prevista + Valor */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100">
            <span className="text-sm text-gray-500">Data prevista</span>
            <span className="text-3xl font-light tracking-tight text-gray-900">
              {expectedDateStr ? formatDateDisplay(expectedDateStr) : "—"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-gray-100 border-l border-gray-200">
            <span className="text-sm text-gray-500">Valor</span>
            <span className="text-3xl font-light tracking-tight text-gray-900">
              {billing.invoice_value != null
                ? formatCurrency(billing.invoice_value)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Seção Dados do faturamento ── */}
      <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 h-12 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">
            Dados do faturamento
          </span>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-6 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">
              Nº do protocolo de faturamento
            </label>
            <div className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg">
              {billing.invoice_protocol ?? "—"}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">
              Envio do faturamento
            </label>
            <div className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg">
              {formatDate(billing.invoice_sent_at)}
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
          billing?.invoice_value != null &&
          receipt?.contested_received_value != null
            ? Math.max(
                0,
                billing.invoice_value - receipt.contested_received_value,
              )
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
