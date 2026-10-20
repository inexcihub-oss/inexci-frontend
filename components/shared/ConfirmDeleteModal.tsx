"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  softDelete?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Confirmar exclusão",
  description,
  itemName,
  onConfirm,
  onCancel,
  loading = false,
  softDelete = false,
}: ConfirmDeleteModalProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelarRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      e.stopPropagation();
      const botoes = Array.from(
        caixaRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        ) ?? [],
      );
      if (botoes.length === 0) return;
      const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
      const proximo = e.shiftKey
        ? (atual <= 0 ? botoes.length : atual) - 1
        : (atual + 1) % botoes.length;
      e.preventDefault();
      botoes[proximo].focus();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onCancel]);

  if (!isOpen || typeof document === "undefined") return null;

  const defaultDescription = itemName
    ? `Tem certeza que deseja excluir "${itemName}"?`
    : "Tem certeza que deseja excluir este item?";
  const texto = description ?? defaultDescription;
  const aviso = softDelete
    ? "O registro será removido das listas, mas o histórico vinculado será preservado."
    : "Esta ação não pode ser desfeita.";
  const avisoNaDescricao = texto.includes(aviso);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        ref={caixaRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H7a1 1 0 000 2h10z"
            />
          </svg>
        </div>

        <h2
          id={tituloId}
          className="text-lg font-semibold text-gray-900 text-center mb-2"
        >
          {title}
        </h2>

        <p
          id={descricaoId}
          className="text-xs md:text-sm text-gray-500 text-center mb-6"
        >
          {texto}
          {!avisoNaDescricao && (
            <>
              <br />
              {aviso}
            </>
          )}
        </p>

        <div className="flex gap-3">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[36px] md:min-h-[44px] active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-xs md:text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[36px] md:min-h-[44px] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
