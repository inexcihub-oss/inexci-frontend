"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { DocumentPreview } from "@/components/clinical/DocumentPreview";
import { baixarArquivo } from "@/components/finance/reports/download";
import { useToast } from "@/hooks/useToast";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";

export interface ReceiptButtonProps {
  paymentId: string;
}

export function ReceiptButton({ paymentId }: ReceiptButtonProps) {
  const [aberto, setAberto] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const { showError } = useToast();

  const { data: html, isLoading, isError } = useQuery({
    queryKey: financeKeys.receiptPreview(paymentId),
    queryFn: () => financeService.getPaymentReceiptPreview(paymentId),
    enabled: aberto,
    staleTime: 0,
  });

  const baixarPdf = async () => {
    setBaixando(true);
    try {
      const blob = await financeService.getPaymentReceiptPdf(paymentId);
      baixarArquivo(blob, `recibo-${paymentId}.pdf`);
    } catch (error) {
      showError(getApiErrorMessage(error, "Não foi possível baixar o recibo."));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:underline min-h-[32px]"
      >
        <FileText className="h-3.5 w-3.5" />
        Recibo
      </button>
      <Modal
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Recibo"
        size="xl"
      >
        <div className="px-4 md:px-6 py-4 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando prévia...</p>
          ) : isError ? (
            <p className="text-sm text-red-600">
              Não foi possível carregar a prévia do recibo.
            </p>
          ) : (
            <div
              aria-label="Prévia do recibo"
              className="max-h-[55vh] md:max-h-[65vh] overflow-auto rounded-xl border border-neutral-200 p-3 md:p-6"
            >
              <DocumentPreview html={html ?? ""} />
            </div>
          )}
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="ds-btn-outline"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={baixarPdf}
            disabled={baixando}
            className="ds-btn-primary"
          >
            {baixando ? "Baixando..." : "Baixar PDF"}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
