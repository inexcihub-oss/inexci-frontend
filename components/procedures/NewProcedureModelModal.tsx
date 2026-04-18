"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/components/ui/Button";
import { X, Search, Plus, Check, Loader2 } from "lucide-react";
import { procedureService, Procedure } from "@/services/procedure.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

interface NewProcedureModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    modelName: string;
    procedureName: string;
    procedure?: Procedure;
  }) => Promise<void>;
}

export function NewProcedureModelModal({
  isOpen,
  onClose,
  onSubmit,
}: NewProcedureModelModalProps) {
  const [modelName, setModelName] = useState("");
  const [procedureSearch, setProcedureSearch] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null,
  );
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [isCreatingProcedure, setIsCreatingProcedure] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelNameInputRef = useRef<HTMLInputElement>(null);
  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(onClose);

  const debouncedSearch = useDebounce(procedureSearch, 300);

  // Focus no primeiro input ao abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Pequeno delay para garantir que o modal renderizou
      setTimeout(() => modelNameInputRef.current?.focus(), 100);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showDropdown) {
          setShowDropdown(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDropdown]);

  // Load procedures when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const loadProcedures = async () => {
      setIsLoadingProcedures(true);
      try {
        const data = await procedureService.getAll();
        setProcedures(data);
      } catch {
        // silently fail
      } finally {
        setIsLoadingProcedures(false);
      }
    };
    loadProcedures();
  }, [isOpen]);

  // Filter procedures based on search
  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const exactMatch = procedures.some(
    (p) => p.name.toLowerCase() === procedureSearch.trim().toLowerCase(),
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectProcedure = useCallback((proc: Procedure) => {
    setSelectedProcedure(proc);
    setProcedureSearch(proc.name);
    setShowDropdown(false);
  }, []);

  const handleCreateProcedure = useCallback(async () => {
    const name = procedureSearch.trim();
    if (!name) return;
    setIsCreatingProcedure(true);
    try {
      const created = await procedureService.create({ name });
      setProcedures((prev) => [created, ...prev]);
      setSelectedProcedure(created);
      setProcedureSearch(created.name);
      setShowDropdown(false);
    } catch {
      // silently fail
    } finally {
      setIsCreatingProcedure(false);
    }
  }, [procedureSearch]);

  const handleSubmit = async () => {
    if (!modelName.trim()) return;
    setIsLoading(true);
    try {
      await onSubmit({
        modelName: modelName.trim(),
        procedureName: selectedProcedure?.name || procedureSearch.trim(),
        procedure: selectedProcedure || undefined,
      });
      handleReset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setModelName("");
    setProcedureSearch("");
    setSelectedProcedure(null);
    setShowDropdown(false);
  };

  const handleClose = () => {
    if (isLoading) return;
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full md:max-w-md flex flex-col rounded-t-3xl md:rounded-2xl max-h-[92vh] md:max-h-[85vh] animate-slide-up md:animate-scale-in md:mx-4 shadow-xl mobile-sheet-offset"
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 md:p-6 border-b border-neutral-100">
          <h2 className="ds-modal-title">Novo modelo</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — sem overflow hidden para o dropdown poder vazar */}
        <div className="flex flex-col gap-5 p-5 md:p-6 overflow-visible">
          {/* Nome do modelo */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Nome do modelo <span className="text-red-500">*</span>
            </label>
            <input
              ref={modelNameInputRef}
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Ex: Artroplastia padrão Bradesco"
              className="ds-input"
              disabled={isLoading}
            />
          </div>

          {/* Procedimento - Search com criação */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Procedimento</label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={procedureSearch}
                  onChange={(e) => {
                    setProcedureSearch(e.target.value);
                    setSelectedProcedure(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar ou criar procedimento..."
                  className="ds-input pl-9"
                  disabled={isLoading}
                />
                {selectedProcedure && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                )}
              </div>

              {/* Dropdown de resultados */}
              {showDropdown && procedureSearch.trim() !== "" && (
                <div className="absolute z-[60] mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {isLoadingProcedures ? (
                    <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Carregando...
                    </div>
                  ) : (
                    <>
                      {filteredProcedures.map((proc) => (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={() => handleSelectProcedure(proc)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${
                            selectedProcedure?.id === proc.id
                              ? "bg-teal-50 text-teal-700 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          <span className="truncate">{proc.name}</span>
                          {selectedProcedure?.id === proc.id && (
                            <Check className="h-4 w-4 text-teal-600 shrink-0" />
                          )}
                        </button>
                      ))}

                      {filteredProcedures.length === 0 && !exactMatch && (
                        <div className="px-3 py-2 text-sm text-gray-400">
                          Nenhum procedimento encontrado.
                        </div>
                      )}

                      {/* Opção de criar novo procedimento */}
                      {procedureSearch.trim() && !exactMatch && (
                        <button
                          type="button"
                          onClick={handleCreateProcedure}
                          disabled={isCreatingProcedure}
                          className="w-full text-left px-3 py-2.5 text-sm text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-2 border-t border-neutral-100 font-medium"
                        >
                          {isCreatingProcedure ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">
                            Criar &ldquo;{procedureSearch.trim()}&rdquo;
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Você poderá adicionar códigos TUSS, OPME e documentos após criar o
              modelo.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 md:px-6 border-t border-neutral-100">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Limpar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading || !modelName.trim()}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              "Criar modelo"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
