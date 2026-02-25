"use client";

import React, { useState, useMemo } from "react";
import { tussService } from "@/services/tuss.service";
import { TussProcedureModal } from "@/components/tuss/TussProcedureModal";
import { useToast } from "@/hooks/useToast";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface CodigoTussTabProps {
  solicitacao: any;
  onUpdate: () => void;
  /** Número do status atual — habilita colunas de autorização a partir do status 3 */
  statusNum?: number;
}

/**
 * Aba de Código TUSS na tela de detalhes da solicitação cirúrgica.
 * - Status < 3: permite adicionar/remover procedimentos.
 * - Status ≥ 3: somente-leitura, exibe coluna "Qtde Autorizada".
 *
 * Referências:
 *   - telas-inexci/status/em-analise/tela-detalhes-status-analise-contestacao-abas-tuss-e-opme.png
 *   - telas-inexci/status/em-agendamento/tela-detalhes-em-agendamento-aba-tuss-e-opme.png
 */
export function CodigoTussTab({
  solicitacao,
  onUpdate,
  statusNum = 0,
}: CodigoTussTabProps) {
  const showAuthorizationColumn = statusNum >= 3;
  const showColorCoding = statusNum >= 4;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { showToast } = useToast();

  const filteredProcedures = useMemo(() => {
    if (!solicitacao.tuss_items) return [];
    if (!searchTerm.trim()) return solicitacao.tuss_items;
    const term = searchTerm.toLowerCase();
    return solicitacao.tuss_items.filter(
      (proc: any) =>
        proc.name?.toLowerCase().includes(term) ||
        proc.tuss_code?.toLowerCase().includes(term),
    );
  }, [solicitacao.tuss_items, searchTerm]);

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

  return (
    <div className="flex-1 border border-neutral-100 rounded-lg overflow-hidden flex flex-col">
      {/* Header com Busca e Botão */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded-lg bg-white w-80">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
            className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 leading-snug placeholder-gray-400"
          />
        </div>

        {/* Botão Novo Procedimento — desabilitado a partir do status Enviada (2) */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={statusNum >= 2}
          className={`flex items-center justify-center font-semibold bg-transparent border border-neutral-100 transition-colors rounded-lg py-1.5 px-3 text-sm leading-normal ${
            statusNum >= 2
              ? "text-gray-400 cursor-not-allowed opacity-60"
              : "text-gray-900 hover:bg-gray-50"
          }`}
        >
          Novo Procedimento
        </button>
      </div>

      {/* Header da Tabela */}
      <div
        className={`flex items-center gap-6 ${showColorCoding ? "pl-4 pr-4" : "pl-4 pr-14"} py-2 border-b border-neutral-100`}
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
          filteredProcedures.map((proc: any) => {
            const isFullyAuthorized =
              proc.authorized_quantity != null &&
              proc.authorized_quantity >= (proc.quantity ?? 1);
            const rowBg = showColorCoding
              ? isFullyAuthorized
                ? "bg-teal-50"
                : "bg-amber-50"
              : "";
            return (
              <div
                key={proc.id}
                className={`relative flex items-center gap-4 ${
                  showColorCoding ? "pl-4 pr-4" : "pl-4 pr-14"
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

                <span className="flex-1 text-sm text-gray-900 leading-normal">
                  {proc.tuss_code || ""} - {proc.name || ""}
                </span>

                <span className="text-xs text-gray-900 leading-snug font-semibold">
                  {showColorCoding
                    ? `${proc.authorized_quantity ?? 0}/${proc.quantity ?? 1}`
                    : (proc.quantity ?? 1)}
                </span>

                {showAuthorizationColumn && !showColorCoding && (
                  <span
                    className={`w-24 text-right text-xs font-semibold leading-snug ${
                      proc.authorized_quantity == null
                        ? "text-gray-400"
                        : proc.authorized_quantity === 0
                          ? "text-red-600"
                          : proc.authorized_quantity < (proc.quantity ?? 1)
                            ? "text-yellow-600"
                            : "text-green-600"
                    }`}
                  >
                    {proc.authorized_quantity ?? "—"}
                  </span>
                )}

                {!showAuthorizationColumn && (
                  /* Botão Delete — posicionado absolutamente à direita */
                  <button
                    onClick={() => handleDelete(proc.id)}
                    disabled={isDeleting === proc.id}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                    aria-label="Remover procedimento"
                  >
                    {isDeleting === proc.id ? (
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
                        width="24"
                        height="24"
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
        existingProcedures={solicitacao.tuss_items ?? []}
      />
    </div>
  );
}
