"use client";

import React, { useState, useMemo } from "react";
import { tussService } from "@/services/tuss.service";
import { TussProcedureModal } from "@/components/tuss/TussProcedureModal";
import { useToast } from "@/hooks/useToast";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useSolicitacao } from "@/contexts/SolicitacaoContext";

interface EditingState {
  id: string;
  quantity: number;
}

export function CodigoTussTab() {
  const { solicitacao, statusNum, onUpdate } = useSolicitacao();
  const showAuthorizationColumn = statusNum >= 3;
  const showColorCoding = statusNum >= 4;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { showToast } = useToast();

  const filteredProcedures = useMemo(() => {
    if (!solicitacao.tussItems) return [];
    if (!searchTerm.trim()) return solicitacao.tussItems;
    const term = searchTerm.toLowerCase();
    return solicitacao.tussItems.filter(
      (proc) =>
        (proc.name as string | undefined)?.toLowerCase().includes(term) ||
        (proc.tussCode as string | undefined)?.toLowerCase().includes(term),
    );
  }, [solicitacao.tussItems, searchTerm]);

  const handleDelete = async (procedureId: string) => {
    if (isDeleting) return;
    setIsDeleting(procedureId);
    try {
      await tussService.removeProcedure(solicitacao.id, procedureId);
      showToast("Procedimento removido com sucesso", "success");
      onUpdate();
    } catch {
      showToast("Erro ao remover procedimento", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStartEdit = (id: string, currentQuantity: number) => {
    setEditingItem({ id, quantity: currentQuantity ?? 1 });
  };

  const handleSaveEdit = async () => {
    if (!editingItem || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await tussService.updateProcedure(editingItem.id, editingItem.quantity);
      showToast("Procedimento atualizado com sucesso", "success");
      onUpdate();
      setEditingItem(null);
    } catch {
      showToast("Erro ao atualizar procedimento", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 border border-neutral-100 rounded-2xl overflow-hidden flex flex-col">
      {/* Header com Busca e Botão */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-100 rounded-xl bg-white w-full sm:w-80">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#111111" strokeWidth="1.5" />
            <path
              d="M16 16L20 20"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar procedimento"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-base md:text-sm text-gray-900 leading-snug placeholder-gray-400"
          />
        </div>

        {/* Botão Novo Procedimento — desabilitado a partir de Em Análise (3) */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={statusNum >= 3}
          className={`ds-btn-inline ${
            statusNum >= 3 ? "text-gray-400 cursor-not-allowed opacity-60" : ""
          }`}
        >
          Novo Procedimento
        </button>
      </div>

      {/* Header da Tabela */}
      <div
        className={`flex items-center gap-6 ${showColorCoding ? "pl-4 pr-4" : "pl-4 pr-20"} py-2 border-b border-neutral-100`}
      >
        {showColorCoding && <div className="w-5 flex-shrink-0" />}
        <span className="flex-1 text-xs text-gray-900 opacity-50">
          Procedimento
        </span>
        <span className="text-xs text-gray-900 opacity-50">
          {showColorCoding
            ? "Quantidade"
            : showAuthorizationColumn
              ? "Qtde Solicitada"
              : "Quantidade"}
        </span>
        {showAuthorizationColumn && !showColorCoding && (
          <span className="text-xs text-gray-900 opacity-50 w-24 text-right">
            Qtde Autorizada
          </span>
        )}
      </div>

      {/* Linhas de Procedimentos */}
      <div className="flex-1 overflow-auto">
        {filteredProcedures.length > 0 ? (
          filteredProcedures.map((proc) => {
            const isFullyAuthorized =
              proc.authorizedQuantity != null &&
              proc.authorizedQuantity >= (proc.quantity ?? 1);
            const rowBg = showColorCoding
              ? isFullyAuthorized
                ? "bg-teal-50"
                : "bg-amber-50"
              : "";
            return (
              <div
                key={proc.id}
                className={`relative flex items-center gap-4 ${
                  showColorCoding ? "pl-4 pr-4" : "pl-4 pr-20"
                } py-3 border-b border-neutral-100 transition-colors ${
                  showColorCoding ? rowBg : "hover:bg-gray-50"
                }`}
              >
                {showColorCoding &&
                  (isFullyAuthorized ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  ))}

                <span className="flex-1 text-xs md:text-sm text-gray-900 leading-normal">
                  {proc.tussCode || ""} - {proc.name || ""}
                </span>

                <span className="text-xs text-gray-900 leading-snug font-semibold">
                  {showColorCoding
                    ? `${proc.authorizedQuantity ?? 0}/${proc.quantity ?? 1}`
                    : (proc.quantity ?? 1)}
                </span>

                {showAuthorizationColumn && !showColorCoding && (
                  <span
                    className={`w-24 text-right text-xs font-semibold leading-snug ${
                      proc.authorizedQuantity == null
                        ? "text-gray-400"
                        : proc.authorizedQuantity === 0
                          ? "text-red-600"
                          : proc.authorizedQuantity < (proc.quantity ?? 1)
                            ? "text-yellow-600"
                            : "text-green-600"
                    }`}
                  >
                    {proc.authorizedQuantity ?? "—"}
                  </span>
                )}

                {!showAuthorizationColumn && (
                  /* Botões Edit e Delete — posicionados absolutamente à direita */
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleStartEdit(String(proc.id), proc.quantity ?? 1)
                      }
                      disabled={!!isDeleting}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                      aria-label="Editar procedimento"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 19H6.4L15.025 10.375L13.625 8.975L5 17.6V19ZM19.3 8.925L15.05 4.725L16.45 3.325C16.8333 2.94167 17.3043 2.75 17.863 2.75C18.4217 2.75 18.8923 2.94167 19.275 3.325L20.675 4.725C21.0583 5.10833 21.2583 5.571 21.275 6.113C21.2917 6.655 21.1083 7.11733 20.725 7.5L19.3 8.925ZM4 21C3.71667 21 3.47933 20.904 3.288 20.712C3.09667 20.52 3.00067 20.2827 3 20V17.175C3 17.0417 3.025 16.9127 3.075 16.788C3.125 16.6633 3.2 16.5507 3.3 16.45L13.6 6.15L17.85 10.4L7.55 20.7C7.45 20.8 7.33767 20.875 7.213 20.925C7.08833 20.975 6.959 21 6.825 21H4Z"
                          fill="#6B7280"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(String(proc.id))}
                      disabled={isDeleting === String(proc.id)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                      aria-label="Remover procedimento"
                    >
                      {isDeleting === String(proc.id) ? (
                        <svg
                          className="animate-spin h-4 w-4 text-red-500"
                          viewBox="0 0 24 24"
                          fill="none"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M7 6H17M10 3H14M7 6V18C7 19.1046 7.89543 20 9 20H15C16.1046 20 17 19.1046 17 18V6M10 11V16M14 11V16"
                            stroke="#E34935"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            {searchTerm
              ? "Nenhum procedimento encontrado"
              : "Nenhum procedimento cadastrado"}
          </div>
        )}
      </div>

      <TussProcedureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        surgeryRequestId={solicitacao.id}
        onSuccess={onUpdate}
        existingProcedures={solicitacao.tussItems ?? []}
      />

      {/* Modal de edição de quantidade */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !isSavingEdit && setEditingItem(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-5 flex flex-col gap-4 w-72">
            <h3 className="text-sm font-semibold text-neutral-900">
              Editar Quantidade
            </h3>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setEditingItem((prev) =>
                    prev
                      ? { ...prev, quantity: Math.max(1, prev.quantity - 1) }
                      : prev,
                  )
                }
                disabled={editingItem.quantity <= 1 || isSavingEdit}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13V11H19V13H5Z" fill="currentColor" />
                </svg>
              </button>
              <div className="w-14 h-10 flex items-center justify-center border border-neutral-200 rounded-xl bg-white text-sm font-semibold text-neutral-900">
                {editingItem.quantity}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, quantity: prev.quantity + 1 } : prev,
                  )
                }
                disabled={isSavingEdit}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingItem(null)}
                disabled={isSavingEdit}
                className="ds-btn-outline text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="ds-btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
