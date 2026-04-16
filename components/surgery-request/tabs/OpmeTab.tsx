"use client";

import React, { useState, useMemo } from "react";
import { opmeService } from "@/services/opme.service";
import { OpmeItem } from "@/services/opme.service";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";
import { OpmeModal } from "@/components/opme/OpmeModal";
import { useToast } from "@/hooks/useToast";
import {
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  PackageX,
  Package,
} from "lucide-react";

interface OpmeTabProps {
  solicitacao: SurgeryRequestDetail;
  onUpdate: () => void;
  /** Número do status atual — habilita coluna de autorização a partir do status 3 */
  statusNum?: number;
}

/** Divide uma string separada por vírgula em array de itens não-vazios */
function splitList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function OpmeTab({
  solicitacao,
  onUpdate,
  statusNum = 0,
}: OpmeTabProps) {
  const showAuthorizationColumn = statusNum >= 3;
  const showColorCoding = statusNum >= 4;
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpme, setEditingOpme] = useState<OpmeItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSettingHasOpme, setIsSettingHasOpme] = useState(false);
  const { showToast } = useToast();

  // has_opme: null = não informado | true = tem OPME | false = sem OPME
  const hasOpme: boolean | null = solicitacao.has_opme ?? null;
  const isReadOnly = statusNum >= 2;

  const handleEdit = (opme: OpmeItem) => {
    setEditingOpme(opme);
    setIsModalOpen(true);
  };

  const handleDelete = async (opmeId: string) => {
    if (isDeleting) return;
    setIsDeleting(opmeId);
    try {
      await opmeService.delete(opmeId, solicitacao.id);
      showToast("Material removido com sucesso", "success");
      onUpdate();
    } catch {
      showToast("Erro ao remover material", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isExpanded = (id: string) => expandedItems[id] ?? true;

  const filteredOpmeItems = useMemo(() => {
    if (!solicitacao.opme_items) return [];
    if (!searchTerm.trim()) return solicitacao.opme_items;
    const term = searchTerm.toLowerCase();
    return solicitacao.opme_items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.distributor?.toLowerCase().includes(term),
    );
  }, [solicitacao.opme_items, searchTerm]);

  const handleSetHasOpme = async (value: boolean) => {
    if (isSettingHasOpme) return;
    setIsSettingHasOpme(true);
    try {
      await opmeService.setHasOpme(solicitacao.id, value);
      onUpdate();
    } catch {
      showToast("Erro ao definir status de OPME", "error");
    } finally {
      setIsSettingHasOpme(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOpme(null);
  };

  return (
    <div className="flex-1 border border-neutral-100 rounded-2xl overflow-hidden flex flex-col">
      {/* ── Banner: decisão se há OPME ──────────────────────────────────── */}
      {hasOpme === null && !isReadOnly && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-semibold text-amber-800">
              Esta solicitação utiliza OPME?
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Informe se há materiais OPME para esta cirurgia.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleSetHasOpme(false)}
              disabled={isSettingHasOpme}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <PackageX className="w-4 h-4" />
              Não há OPME
            </button>
            <button
              onClick={() => handleSetHasOpme(true)}
              disabled={isSettingHasOpme}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold text-teal-700 bg-white border border-teal-200 rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              Sim, há OPME
            </button>
          </div>
        </div>
      )}

      {/* ── Banner: sem OPME confirmado ──────────────────────────────────── */}
      {hasOpme === false && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <PackageX className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-xs md:text-sm text-gray-600">
              Confirmado: <span className="font-semibold">não há OPME</span>{" "}
              nesta solicitação.
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => handleSetHasOpme(true)}
              disabled={isSettingHasOpme}
              className="text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              Alterar
            </button>
          )}
        </div>
      )}

      {/* ── Header: busca + botão (visível apenas quando há OPME ou null+readOnly) ─ */}
      {(hasOpme === true || (hasOpme === null && isReadOnly)) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100">
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-100 rounded-xl bg-white flex-1 sm:flex-initial sm:min-w-[288px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="#111111"
                strokeWidth="1.5"
              />
              <path
                d="M16 16L20 20"
                stroke="#111111"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Busque materiais e dispositivos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base md:text-sm leading-snug placeholder-gray-400"
            />
          </div>

          {/* Botão Adicionar OPME — desabilitado a partir do status Enviada (2) */}
          <button
            onClick={() => {
              setEditingOpme(null);
              setIsModalOpen(true);
            }}
            disabled={isReadOnly}
            className={`ds-btn-inline ${
              isReadOnly ? "text-gray-400 cursor-not-allowed opacity-60" : ""
            }`}
          >
            Adicionar OPME
          </button>
        </div>
      )}

      {/* ── Cabeçalho da coluna ─────────────────────────────────────────── */}
      {(hasOpme === true || hasOpme === null) && (
        <div className="flex items-center gap-3 px-4 py-1 border-b border-neutral-100">
          <div className="w-6 h-6 opacity-0" aria-hidden />
          <span className="flex-1 text-xs text-gray-900 opacity-50 leading-snug">
            Descrição
          </span>
          <div className="w-6 h-6 opacity-0" aria-hidden />
        </div>
      )}

      {/* ── Lista de materiais ──────────────────────────────────────────── */}
      {(hasOpme === true || hasOpme === null) && (
        <div className="flex-1 overflow-auto">
          {filteredOpmeItems.length > 0 ? (
            filteredOpmeItems.map((material: any) => {
              const manufacturers = splitList(material.brand);
              const suppliers = splitList(material.distributor);
              const expanded = isExpanded(material.id);
              const isFullyAuthorized =
                showColorCoding &&
                material.authorized_quantity != null &&
                material.authorized_quantity >= (material.quantity ?? 1);
              const headerBg = showColorCoding
                ? isFullyAuthorized
                  ? "bg-teal-50"
                  : "bg-amber-50"
                : "bg-white";

              return (
                <div key={material.id} className="flex flex-col w-full">
                  {/* Título do item */}
                  <div
                    className={`flex items-center w-full gap-3 px-4 py-3 border-b border-neutral-100 ${headerBg}`}
                  >
                    <button
                      onClick={() => toggleItem(material.id)}
                      className={`w-6 h-6 flex items-center justify-center transition-transform flex-shrink-0 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Recolher" : "Expandir"} ${material.name}`}
                    >
                      <ChevronRight
                        className="w-5 h-5 text-gray-900"
                        strokeWidth={1.5}
                      />
                    </button>

                    <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 leading-normal">
                      {material.name}
                    </span>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-500">Quantidade:</span>
                      <span className="text-xs md:text-sm font-semibold text-gray-900">
                        {showColorCoding
                          ? `${material.authorized_quantity ?? 0}/${material.quantity ?? 1}`
                          : (material.quantity ?? "-")}
                      </span>
                    </div>

                    {showColorCoding &&
                      (isFullyAuthorized ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      ))}

                    {/* Ações — ocultar no modo somente-leitura */}
                    {!showAuthorizationColumn && (
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(material);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                          aria-label="Editar material"
                        >
                          <Pencil
                            className="w-4 h-4 text-neutral-200"
                            strokeWidth={1.5}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(material.id);
                          }}
                          disabled={isDeleting === material.id}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          aria-label="Remover material"
                        >
                          {isDeleting === material.id ? (
                            <svg
                              className="animate-spin w-4 h-4 text-red-400"
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
                            <Trash2
                              className="w-4 h-4 text-red-400"
                              strokeWidth={1.5}
                            />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tabela Fabricantes / Fornecedores */}
                  {expanded && (
                    <div className="flex flex-col sm:flex-row w-full border-b border-neutral-100">
                      {/* Fabricantes */}
                      <div className="flex-1 flex flex-col sm:border-r border-b sm:border-b-0 border-neutral-100">
                        {/* Header */}
                        <div className="flex w-full px-4 py-3 bg-white border-b border-neutral-100">
                          <span className="text-xs font-semibold text-gray-500 w-full">
                            FABRICANTES
                          </span>
                        </div>
                        {/* Itens */}
                        {manufacturers.length > 0 ? (
                          manufacturers.map((m, i) => (
                            <div
                              key={i}
                              className={`flex w-full px-4 py-3 bg-gray-100 ${
                                i < manufacturers.length - 1
                                  ? "border-b border-neutral-100"
                                  : ""
                              }`}
                            >
                              <span className="text-xs text-gray-900 w-full">
                                {m}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex w-full px-4 py-3 bg-gray-100">
                            <span className="text-xs text-gray-400 italic">
                              Não informado
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Fornecedores */}
                      <div className="flex-1 flex flex-col">
                        {/* Header */}
                        <div className="flex w-full px-4 py-3 bg-white border-b border-neutral-100">
                          <span className="text-xs font-semibold text-gray-500 w-full">
                            FORNECEDORES
                          </span>
                        </div>
                        {/* Itens */}
                        {suppliers.length > 0 ? (
                          suppliers.map((s, i) => (
                            <div
                              key={i}
                              className={`flex w-full px-4 py-3 bg-gray-100 ${
                                i < suppliers.length - 1
                                  ? "border-b border-neutral-100"
                                  : ""
                              }`}
                            >
                              <span className="text-xs text-gray-900 w-full">
                                {s}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex w-full px-4 py-3 bg-gray-100">
                            <span className="text-xs text-gray-400 italic">
                              Não informado
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-xs md:text-sm">
              {searchTerm
                ? "Nenhum material encontrado"
                : "Nenhum material OPME cadastrado"}
            </div>
          )}
        </div>
      )}

      <OpmeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        surgeryRequestId={solicitacao.id}
        onSuccess={onUpdate}
        editingOpme={editingOpme}
      />
    </div>
  );
}
