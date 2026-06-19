"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Pencil, Check, Search, Loader2 } from "lucide-react";
import {
  ProcedureModel,
  ProcedureDocument,
  ProcedureOpmeItem,
  ProcedureTussItem,
} from "./types";
import { logger } from "@/lib/logger";
import { AddDocumentModal } from "./AddDocumentModal";
import { OpmeModal } from "@/components/opme/OpmeModal";
import { TussProcedureModal } from "@/components/tuss/TussProcedureModal";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { supplierService } from "@/services/supplier.service";
import { manufacturerService } from "@/services/manufacturer.service";
import { procedureService, Procedure } from "@/services/procedure.service";

interface ProcedureSideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: ProcedureModel | null;
  onUseTemplate?: (template: any) => void;
  onTemplateUpdated?: () => void;
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProcedureSideSheet({
  isOpen,
  onClose,
  procedure,
  onUseTemplate,
  onTemplateUpdated,
}: ProcedureSideSheetProps) {
  const [documents, setDocuments] = useState<ProcedureDocument[]>([]);
  const [opmeItems, setOpmeItems] = useState<ProcedureOpmeItem[]>([]);
  const [tussItems, setTussItems] = useState<ProcedureTussItem[]>([]);
  const [modelName, setModelName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isOpmeModalOpen, setIsOpmeModalOpen] = useState(false);
  const [isTussModalOpen, setIsTussModalOpen] = useState(false);
  const [expandedOpme, setExpandedOpme] = useState<Record<string, boolean>>({});
  const [procedureName, setProcedureName] = useState("—");
  const [isEditingProcedure, setIsEditingProcedure] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [procedureOptions, setProcedureOptions] = useState<Procedure[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [isSavingProcedure, setIsSavingProcedure] = useState(false);
  const [selectedProcedureOption, setSelectedProcedureOption] =
    useState<Procedure | null>(null);
  const procedureDropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state when procedure changes
  useEffect(() => {
    if (procedure) {
      setDocuments(procedure.documents || []);
      setOpmeItems(procedure.opmeItems || []);
      setTussItems(procedure.tussItems || []);
      setModelName(procedure.modelName);
      setProcedureName(procedure.procedureName || "—");
      setProcedureSearch(procedure.procedureName || "");

      const rawProcedure = (procedure as any)?._raw?.templateData?.procedure;
      if (rawProcedure?.id && rawProcedure?.name) {
        setSelectedProcedureOption({
          id: String(rawProcedure.id),
          name: String(rawProcedure.name),
          createdAt: "",
          updatedAt: "",
        });
      } else {
        setSelectedProcedureOption(null);
      }

      setIsEditingProcedure(false);
    }
  }, [procedure]);

  // Carrega procedimentos cadastrados para edição do tipo
  useEffect(() => {
    if (!isOpen) return;
    const loadProcedureOptions = async () => {
      setIsLoadingProcedures(true);
      try {
        const data = await procedureService.getAll();
        setProcedureOptions(data);
      } catch {
        setProcedureOptions([]);
      } finally {
        setIsLoadingProcedures(false);
      }
    };

    loadProcedureOptions();
  }, [isOpen]);

  // Fecha dropdown de procedimento ao clicar fora
  useEffect(() => {
    if (!isEditingProcedure) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        procedureDropdownRef.current &&
        !procedureDropdownRef.current.contains(e.target as Node)
      ) {
        setIsEditingProcedure(false);
        setProcedureSearch(procedureName === "—" ? "" : procedureName);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isEditingProcedure, procedureName]);

  // Focus input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  if (!isOpen || !procedure) return null;

  const hasDocuments = documents.length > 0;
  const hasOpme = opmeItems.length > 0;
  const hasTuss = tussItems.length > 0;

  // Persiste alterações no templateData via API
  const persistTemplateData = async (updates: {
    name?: string;
    procedure?: { id: string; name: string } | null;
    procedureName?: string;
    opmeItems?: any[];
    tussItems?: any[];
    requiredDocuments?: any[];
  }) => {
    try {
      const raw = (procedure as any)._raw;
      if (!raw) return;
      const currentData = raw.templateData || {};
      const newData = { ...currentData };
      if (updates.opmeItems !== undefined)
        newData.opmeItems = updates.opmeItems;
      if (updates.tussItems !== undefined)
        newData.tussItems = updates.tussItems;
      if (updates.requiredDocuments !== undefined)
        newData.requiredDocuments = updates.requiredDocuments;
      if (updates.procedure !== undefined)
        newData.procedure = updates.procedure;
      if (updates.procedureName !== undefined)
        newData.procedureName = updates.procedureName;

      const payload: { name?: string; templateData?: object } = {
        templateData: newData,
      };
      if (updates.name !== undefined) payload.name = updates.name;

      await surgeryRequestService.updateTemplate(procedure.id, payload);
      onTemplateUpdated?.();
    } catch (err) {
      logger.error("Erro ao atualizar template:", err);
    }
  };

  const toggleOpmeExpand = (id: string) => {
    setExpandedOpme((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddDocument = (doc: { type: string; name: string }) => {
    const newDoc = { id: String(Date.now()), type: doc.type, name: doc.name };
    const newDocs = [...documents, newDoc];
    setDocuments(newDocs);
    persistTemplateData({
      requiredDocuments: newDocs.map((d) => ({ type: d.type, name: d.name })),
    });
  };

  const handleRemoveDocument = (id: string) => {
    const newDocs = documents.filter((d) => d.id !== id);
    setDocuments(newDocs);
    persistTemplateData({
      requiredDocuments: newDocs.map((d) => ({ type: d.type, name: d.name })),
    });
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    if (modelName.trim() && modelName !== procedure.modelName) {
      persistTemplateData({ name: modelName.trim() });
    }
  };

  const filteredProcedureOptions = procedureOptions.filter((item) =>
    item.name.toLowerCase().includes(procedureSearch.trim().toLowerCase()),
  );

  const handleSelectProcedure = async (item: Procedure) => {
    if (isSavingProcedure) return;

    const previousName = procedureName;
    setIsSavingProcedure(true);
    setProcedureName(item.name);
    setProcedureSearch(item.name);
    setSelectedProcedureOption(item);

    try {
      await persistTemplateData({
        procedure: { id: item.id, name: item.name },
        procedureName: item.name,
      });
      setIsEditingProcedure(false);
    } catch {
      setProcedureName(previousName);
      setProcedureSearch(previousName === "—" ? "" : previousName);
    } finally {
      setIsSavingProcedure(false);
    }
  };

  const handleOpmeLocalSave = async (
    items: {
      name: string;
      manufacturers: string[];
      suppliers: string[];
      quantity: number;
    }[],
  ) => {
    // Coleta todos os nomes de fabricantes únicos informados
    const allManufacturerNames = [
      ...new Set(items.flatMap((item) => item.manufacturers).filter(Boolean)),
    ];

    if (allManufacturerNames.length > 0) {
      try {
        // Busca fabricantes já existentes para evitar duplicatas
        const existingManufacturers = await manufacturerService.getAll();
        const existingNames = new Set(
          existingManufacturers.map((m) => m.name.toLowerCase().trim()),
        );

        // Cria apenas os fabricantes que ainda não existem
        const toCreate = allManufacturerNames.filter(
          (name) => !existingNames.has(name.toLowerCase().trim()),
        );

        await Promise.all(
          toCreate.map((name) => manufacturerService.create({ name })),
        );
      } catch (err) {
        logger.error("Erro ao criar fabricantes:", err);
      }
    }

    // Coleta todos os nomes de fornecedores únicos informados
    const allSupplierNames = [
      ...new Set(items.flatMap((item) => item.suppliers).filter(Boolean)),
    ];

    if (allSupplierNames.length > 0) {
      try {
        // Busca fornecedores já existentes para evitar duplicatas
        const existingSuppliers = await supplierService.getAll();
        const existingNames = new Set(
          existingSuppliers.map((s) => s.name.toLowerCase().trim()),
        );

        // Cria apenas os fornecedores que ainda não existem
        const toCreate = allSupplierNames.filter(
          (name) => !existingNames.has(name.toLowerCase().trim()),
        );

        await Promise.all(
          toCreate.map((name) => supplierService.create({ name })),
        );
      } catch (err) {
        logger.error("Erro ao criar fornecedores:", err);
      }
    }

    const mapped: ProcedureOpmeItem[] = items.map((item, i) => ({
      id: String(i),
      name: item.name,
      manufacturers: item.manufacturers,
      suppliers: item.suppliers,
      quantity: item.quantity,
    }));
    setOpmeItems(mapped);
    persistTemplateData({ opmeItems: items });
  };

  const handleTussLocalSave = (
    items: { tussCode: string; name: string; quantity: number }[],
  ) => {
    const mapped: ProcedureTussItem[] = items.map((item, i) => ({
      id: String(i),
      code: item.tussCode,
      name: item.name,
      quantity: item.quantity,
    }));
    setTussItems(mapped);
    persistTemplateData({ tussItems: items });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-2xl flex flex-col max-h-[92vh] md:max-h-[90vh] md:mx-4 mobile-sheet-offset">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <input
                  ref={nameInputRef}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setModelName(procedure.modelName);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={handleSaveName}
                  className="text-lg font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent flex-1"
                />
                <button
                  onClick={handleSaveName}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {modelName}
                </h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 modal-content-mobile">
            {/* ─── Informações Gerais ─── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 py-2">
                <h3 className="text-sm md:text-base font-semibold text-black">
                  Informações Gerais
                </h3>
              </div>

              {/* Procedimento */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
                <span className="text-xs text-gray-500">Procedimento</span>
                <div
                  className="flex items-start justify-between sm:justify-start gap-2.5 w-full sm:w-auto"
                  ref={procedureDropdownRef}
                >
                  <div className="relative w-full sm:w-72">
                    {isEditingProcedure ? (
                      <>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={procedureSearch}
                          onChange={(e) => setProcedureSearch(e.target.value)}
                          placeholder="Buscar procedimento..."
                          className="w-full h-10 pl-9 pr-3 text-xs md:text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          autoFocus
                        />

                        <div className="absolute z-[70] mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {isLoadingProcedures ? (
                            <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Carregando procedimentos...
                            </div>
                          ) : filteredProcedureOptions.length === 0 ? (
                            <div className="px-3 py-2.5 text-sm text-gray-400">
                              Nenhum procedimento cadastrado encontrado.
                            </div>
                          ) : (
                            filteredProcedureOptions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectProcedure(item)}
                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                  selectedProcedureOption?.id === item.id
                                    ? "bg-teal-50 text-teal-700 font-medium"
                                    : "text-gray-700 hover:bg-teal-50"
                                }`}
                              >
                                <span className="truncate">{item.name}</span>
                                {selectedProcedureOption?.id === item.id && (
                                  <Check className="h-4 w-4 text-teal-600 shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl w-full h-10">
                        <span className="text-xs md:text-sm text-gray-900 truncate">
                          {procedureName}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (isSavingProcedure) return;
                      setIsEditingProcedure((prev) => !prev);
                      setProcedureSearch(
                        procedureName === "—" ? "" : procedureName,
                      );
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                    disabled={isSavingProcedure}
                  >
                    {isSavingProcedure ? (
                      <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
                    ) : (
                      <IconEdit className="w-6 h-6 text-neutral-900" />
                    )}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-b border-gray-200" />

              {/* Details row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-8 py-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-gray-500">Criado em</span>
                  <span className="text-xs md:text-sm text-gray-900">
                    {procedure.createdAt}
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-gray-500">Criado por</span>
                  <span className="text-xs md:text-sm text-gray-900 break-words">
                    {procedure.createdBy}
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500">Número de usos</span>
                  <span className="text-xs md:text-sm text-gray-900">
                    {procedure.usageCount} vezes
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Documentos e exames ─── */}
            <div className="border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between px-4 py-0 border-b border-gray-200">
                <div className="flex items-center gap-2.5 py-4 px-3">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                    Documentos e exames
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddDocModalOpen(true)}
                  className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
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
                        <span className="text-xs md:text-sm text-gray-900">
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
                <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      Nenhum documento ou exame definido
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">
                      Especifique os documentos e exames usualmente necessários
                      para esse procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddDocModalOpen(true)}
                    className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
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
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                    OPME (Órteses, Próteses e Materiais Especiais)
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpmeModalOpen(true)}
                  className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
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
                  {opmeItems.map((item) => {
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
                          <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">
                              Quantidade:
                            </span>
                            <span className="text-xs md:text-sm font-semibold text-gray-900">
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
                <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      Você ainda não definiu as OPMEs
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">
                      Especifique OPME usualmente necessárias para esse
                      procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpmeModalOpen(true)}
                    className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
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
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                    Procedimentos e Códigos TUSS
                  </h3>
                </div>
                <button
                  onClick={() => setIsTussModalOpen(true)}
                  className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
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
                  {tussItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-6 px-4 py-3 ${
                        index < tussItems.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <span className="flex-1 text-xs md:text-sm text-gray-900">
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
                <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      Nenhum código definido para esse procedimento
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">
                      Especifique os códigos usualmente necessários para esse
                      procedimento
                    </span>
                  </div>
                  <button
                    onClick={() => setIsTussModalOpen(true)}
                    className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <button onClick={onClose} className="ds-btn-outline">
              Fechar
            </button>
            <button
              onClick={() => {
                const raw = (procedure as any)._raw;
                if (raw) {
                  onClose();
                  onUseTemplate?.(raw);
                }
              }}
              className="ds-btn-primary"
            >
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
        onLocalSave={handleOpmeLocalSave}
        initialItems={opmeItems.map((item) => ({
          name: item.name,
          manufacturers: item.manufacturers,
          suppliers: item.suppliers,
          quantity: item.quantity,
        }))}
      />

      <TussProcedureModal
        isOpen={isTussModalOpen}
        onClose={() => setIsTussModalOpen(false)}
        surgeryRequestId={procedure.id}
        onSuccess={() => setIsTussModalOpen(false)}
        onLocalSave={handleTussLocalSave}
      />
    </>
  );
}
