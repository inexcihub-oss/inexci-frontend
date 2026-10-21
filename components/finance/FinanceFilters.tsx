"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MOBILE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

export function periodSummary(from?: string, to?: string): string | undefined {
  if (from && to) return `${dataCurta(from)} a ${dataCurta(to)}`;
  if (from) return `A partir de ${dataCurta(from)}`;
  if (to) return `Até ${dataCurta(to)}`;
  return undefined;
}

interface FinanceFiltersProps {
  children: ReactNode;
  activeCount?: number;
  summary?: string;
  onClear?: () => void;
  error?: string | null;
}

export function FinanceFilters({
  children,
  activeCount = 0,
  summary,
  onClear,
  error,
}: FinanceFiltersProps) {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [aberto, setAberto] = useState(false);

  if (!mobile) return <>{children}</>;

  const ativo = activeCount > 0;
  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={cn(
            "flex items-center gap-1.5 h-9 px-3 py-1.5 border rounded-xl transition-colors shrink-0",
            ativo
              ? "border-teal-600 bg-teal-50 hover:bg-teal-100"
              : "border-neutral-100 bg-white hover:bg-neutral-50",
          )}
        >
          <Image
            src="/icons/filter.svg"
            alt=""
            width={16}
            height={16}
            className={
              ativo
                ? "[filter:invert(29%)sepia(74%)saturate(485%)hue-rotate(134deg)brightness(92%)contrast(87%)]"
                : ""
            }
          />
          <span
            className={cn(
              "text-xs font-medium",
              ativo ? "text-teal-700" : "text-black",
            )}
          >
            Filtros
          </span>
          {ativo && (
            <span className="flex items-center justify-center w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </button>
        {summary && (
          <span className="text-xs text-neutral-500 truncate">{summary}</span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <Modal
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Filtros"
        size="sm"
      >
        <div className="ds-modal-body">{children}</div>
        <ModalFooter align={onClear ? "between" : "end"}>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={!ativo}
              className="ds-btn-outline"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="ds-btn-primary"
          >
            Ver resultados
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
