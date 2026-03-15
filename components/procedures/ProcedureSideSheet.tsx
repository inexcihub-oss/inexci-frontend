"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { ProcedureModel, ProcedureDocument } from "./types";
import { AddDocumentModal } from "./AddDocumentModal";
import { OpmeModal } from "@/components/opme/OpmeModal";
import { TussProcedureModal } from "@/components/tuss/TussProcedureModal";

interface ProcedureSideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: ProcedureModel | null;
}

// ─── Ícones SVG ───────────────────────────────────────────────────────────────

const _IconClose = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconEdit = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 19H6.4L15.025 10.375L13.625 8.975L5 17.6V19ZM19.3 8.925L15.05 4.725L16.45 3.325C16.8333 2.94167 17.3043 2.75 17.863 2.75C18.4217 2.75 18.8923 2.94167 19.275 3.325L20.675 4.725C21.0583 5.10833 21.2583 5.571 21.275 6.113C21.2917 6.655 21.1083 7.11733 20.725 7.5L19.3 8.925ZM4 21C3.71667 21 3.47933 20.904 3.288 20.712C3.09667 20.52 3.00067 20.2827 3 20V17.175C3 17.0417 3.025 16.9127 3.075 16.788C3.125 16.6633 3.2 16.5507 3.3 16.45L13.6 6.15L17.85 10.4L7.55 20.7C7.45 20.8 7.33767 20.875 7.213 20.925C7.08833 20.975 6.959 21 6.825 21H4Z"
      fill="currentColor"
    />
  </svg>
);

const IconDocument = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 3V1H19V17H17V3H9ZM5 5H15V23H5V5ZM7 7V21H13V7H7ZM8 9H12V10H8V9ZM8 12H12V13H8V12ZM8 15H10V16H8V15Z"
      fill="currentColor"
    />
  </svg>
);

const IconArrowDown = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 15L7 10H17L12 15Z" fill="currentColor" />
  </svg>
);

const IconArrowRight = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 17L15 12L10 7V17Z" fill="currentColor" />
  </svg>
);

const IconTrash = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 21C6.45 21 5.97933 20.8043 5.588 20.413C5.19667 20.0217 5.00067 19.5507 5 19V6H4V4H9V3H15V4H20V6H19V19C19 19.55 18.8043 20.021 18.413 20.413C18.0217 20.805 17.5507 21.0007 17 21H7ZM9 17H11V8H9V17ZM13 17H15V8H13V17Z"
      fill="currentColor"
    />
  </svg>
);

// ─── Mock data for filled state ───────────────────────────────────────────────

const MOCK_DOCUMENTS: ProcedureDocument[] = [
  { id: "1", type: "Identidade", name: "Identidade (RG/CNH/CPF)" },
  { id: "2", type: "Convênio", name: "Carteira do convênio" },
  { id: "3", type: "Pedido", name: "Pedido médico" },
  { id: "4", type: "Exame", name: "Raio-X de bacia (AP e perfil)" },
  { id: "5", type: "Exame", name: "Ressonância magnética do quadril" },
  {
    id: "6",
    type: "Exame",
    name: "Exames laboratoriais pré-operatórios",
  },
  { id: "7", type: "Exame", name: "Eletrocardiograma" },
];

const MOCK_OPME_ITEMS = [
  {
    id: "1",
    name: "Âncora absorvível (2,7 mm)",
    quantity: 1,
    manufacturers: ["Smith & Newphew", "Arthrex", "Johnson & Johnson"],
    suppliers: ["OrthoSupplies", "MedOrto Comercial", "HospMed Produtos"],
  },
  {
    id: "2",
    name: "Parafuso interferencial bioabsorvível 7x25mm",
    quantity: 2,
    manufacturers: ["Smith & Newphew", "Arthrex", "Johnson & Johnson"],
    suppliers: ["OrthoSupplies", "MedOrto Comercial", "HospMed Produtos"],
  },
  {
    id: "3",
    name: "Âncora metálica com fio não absorvível 5,5 mm",
    quantity: 2,
    manufacturers: [],
    suppliers: [],
  },
];

const MOCK_TUSS_ITEMS = [
  {
    id: "1",
    code: "04.08.03.009-6",
    name: "Artroplastia total de quadril",
    quantity: 1,
  },
  {
    id: "2",
    code: "04.01.01.001-2",
    name: "Anestesia regional e/ou geral",
    quantity: 1,
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProcedureSideSheet({
  isOpen,
  onClose,
  procedure,
}: ProcedureSideSheetProps) {
  const [documents, setDocuments] = useState<ProcedureDocument[]>(
    procedure?.documents || MOCK_DOCUMENTS,
  );
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isOpmeModalOpen, setIsOpmeModalOpen] = useState(false);
  const [isTussModalOpen, setIsTussModalOpen] = useState(false);
  const [expandedOpme, setExpandedOpme] = useState<Record<string, boolean>>({});

  if (!isOpen || !procedure) return null;

  const hasDocuments = documents.length > 0;
  const hasOpme = MOCK_OPME_ITEMS.length > 0;
  const hasTuss = MOCK_TUSS_ITEMS.length > 0;

  const toggleOpmeExpand = (id: string) => {
    setExpandedOpme((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddDocument = (doc: { type: string; name: string }) => {
    setDocuments((prev) => [
      ...prev,
      { id: String(Date.now()), type: doc.type, name: doc.name },
    ]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] mx-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {procedure.modelName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* ─── Informações Gerais ─── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 py-2">
                <h3 className="text-base font-semibold text-black">
                  Informações Gerais
                </h3>
              </div>

              {/* Procedimento */}
              <div className="flex items-center justify-between gap-1 py-2">
                <span className="text-xs text-gray-500">Procedimento</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl w-72">
                    <span className="text-sm text-gray-900 truncate">
                      {procedure.procedureName}
                    </span>
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <IconEdit className="w-6 h-6 text-neutral-900" />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-b border-gray-200" />

              {/* Details row */}
              <div className="flex gap-16 py-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Criado em</span>
                  <span className="text-sm text-gray-900">
                    {procedure.createdAt}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Criado por</span>
                  <span className="text-sm text-gray-900">
                    {procedure.createdBy}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Número de usos</span>
                  <span className="text-sm text-gray-900">
                    {procedure.usageCount} vezes
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Documentos e exames ─── */}
            <div className="border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between px-4 py-0 border-b border-gray-200">
                <div className="flex items-center gap-2.5 py-4 px-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Documentos e exames
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddDocModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Adicionar
                </button>
              </div>

              {hasDocuments ? (
                <div>
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-200">
                    <span className="text-xs text-gray-500">Tipo</span>
                  </div>

                  {/* Document rows */}
                  {documents.map((doc, index) => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between px-6 py-3 ${
                        index < documents.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <IconDocument className="w-6 h-6 text-gray-700" />
                        <span className="text-sm text-gray-900">
                          {doc.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="flex items-center gap-2 text-neutral-500 hover:text-red-500 transition-colors"
                      >
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-medium text-gray-900">
                      Nenhum documento ou exame definido
                    </span>
                    <span className="text-sm text-gray-500">
                      Especifique os documentos e exames usualmente necessários
                      para esse procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddDocModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* ─── OPME ─── */}
            <div className="border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between px-4 py-0 border-b border-gray-200">
                <div className="flex items-center gap-2.5 py-4 px-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    OPME (Órteses, Próteses e Materiais Especiais)
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpmeModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
              </div>

              {hasOpme ? (
                <div>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-1 border-b border-gray-200">
                    <span className="text-xs text-gray-500">Descrição</span>
                  </div>

                  {/* OPME Items */}
                  {MOCK_OPME_ITEMS.map((item) => {
                    const isExpanded = expandedOpme[item.id] ?? true;
                    return (
                      <div key={item.id}>
                        {/* Item Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
                          <button
                            onClick={() => toggleOpmeExpand(item.id)}
                            className="transition-transform"
                          >
                            {isExpanded ? (
                              <IconArrowDown className="w-6 h-6 text-gray-700" />
                            ) : (
                              <IconArrowRight className="w-6 h-6 text-gray-700" />
                            )}
                          </button>
                          <span className="flex-1 text-sm font-semibold text-gray-900">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">
                              Quantidade:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && item.manufacturers.length > 0 && (
                          <div className="flex border-b border-gray-200">
                            {/* Fabricantes */}
                            <div className="flex-1 border-r border-gray-200">
                              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                <span className="text-xs font-semibold text-gray-500">
                                  FABRICANTES
                                </span>
                              </div>
                              {item.manufacturers.map((m, i) => (
                                <div
                                  key={i}
                                  className={`px-4 py-3 bg-gray-50 ${
                                    i < item.manufacturers.length - 1
                                      ? "border-b border-gray-200"
                                      : ""
                                  }`}
                                >
                                  <span className="text-xs text-gray-900">
                                    {m}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Fornecedores */}
                            <div className="flex-1">
                              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                <span className="text-xs font-semibold text-gray-500">
                                  FORNECEDORES
                                </span>
                              </div>
                              {item.suppliers.map((s, i) => (
                                <div
                                  key={i}
                                  className={`px-4 py-3 bg-gray-50 ${
                                    i < item.suppliers.length - 1
                                      ? "border-b border-gray-200"
                                      : ""
                                  }`}
                                >
                                  <span className="text-xs text-gray-900">
                                    {s}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-medium text-gray-900">
                      Você ainda não definiu as OPMEs
                    </span>
                    <span className="text-sm text-gray-500">
                      Especifique OPME usualmente necessárias para esse
                      procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpmeModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* ─── Procedimentos e Códigos TUSS ─── */}
            <div className="border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between px-4 py-0 border-b border-gray-200">
                <div className="flex items-center gap-2.5 py-4 px-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Procedimentos e Códigos TUSS
                  </h3>
                </div>
                <button
                  onClick={() => setIsTussModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
              </div>

              {hasTuss ? (
                <div>
                  {/* Header */}
                  <div className="flex items-center gap-6 px-4 py-1 border-b border-gray-200">
                    <span className="flex-1 text-xs text-gray-500">
                      Procedimento
                    </span>
                    <span className="text-xs text-gray-500">Quantidade</span>
                  </div>

                  {/* TUSS Items */}
                  {MOCK_TUSS_ITEMS.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-6 px-4 py-3 ${
                        index < MOCK_TUSS_ITEMS.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <span className="flex-1 text-sm text-gray-900">
                        {item.code} - {item.name}
                      </span>
                      <span className="text-xs text-gray-900">
                        {item.quantity}
                      </span>
                      <button className="flex items-center gap-2 text-neutral-500 hover:text-red-500 transition-colors">
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-medium text-gray-900">
                      Nenhum código definido para esse procedimento
                    </span>
                    <span className="text-sm text-gray-500">
                      Especifique os códigos usualmente necessários para esse
                      procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsTussModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-colors">
              Usar modelo
            </button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <AddDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onAdd={handleAddDocument}
      />

      <OpmeModal
        isOpen={isOpmeModalOpen}
        onClose={() => setIsOpmeModalOpen(false)}
        surgeryRequestId={procedure.id}
        onSuccess={() => setIsOpmeModalOpen(false)}
      />

      <TussProcedureModal
        isOpen={isTussModalOpen}
        onClose={() => setIsTussModalOpen(false)}
        surgeryRequestId={procedure.id}
        onSuccess={() => setIsTussModalOpen(false)}
      />
    </>
  );
}
