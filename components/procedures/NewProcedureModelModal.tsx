"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { procedureService, Procedure } from "@/services/procedure.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

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
  const { emTour } = useOnboarding();
  const [modelName, setModelName] = useState("");
  const [procedureSearch, setProcedureSearch] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null,
  );
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [isCreatingProcedure, setIsCreatingProcedure] = useState(false);
  const [procedureError, setProcedureError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const modelNameInputRef = useRef<HTMLInputElement>(null);
  const {
    anchorRef,
    dropdownRef,
    position: dropdownPosition,
  } = useAnchoredDropdown(showDropdown, () => setShowDropdown(false), {
    placement: "auto",
    maxHeight: 192,
  });

  const debouncedSearch = useDebounce(procedureSearch, 300);

  const handleReset = useCallback(() => {
    setModelName("");
    setProcedureSearch("");
    setSelectedProcedure(null);
    setShowDropdown(false);
    setProcedureError("");
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    handleReset();
    onClose();
  }, [isLoading, handleReset, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => modelNameInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && showDropdown) {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const loadProcedures = async () => {
      setIsLoadingProcedures(true);
      try {
        const data = await procedureService.getAll();
        setProcedures(data);
      } catch {
      } finally {
        setIsLoadingProcedures(false);
      }
    };
    loadProcedures();
  }, [isOpen]);

  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const exactMatch = procedures.some(
    (p) => p.name.toLowerCase() === procedureSearch.trim().toLowerCase(),
  );

  const handleSelectProcedure = useCallback((proc: Procedure) => {
    setSelectedProcedure(proc);
    setProcedureSearch(proc.name);
    setShowDropdown(false);
  }, []);

  const handleCreateProcedure = useCallback(async () => {
    const name = procedureSearch.trim();
    if (!name) return;
    setIsCreatingProcedure(true);
    setProcedureError("");
    try {
      const created = await procedureService.create({ name });
      setProcedures((prev) => [created, ...prev]);
      setSelectedProcedure(created);
      setProcedureSearch(created.name);
      setShowDropdown(false);
    } catch (err) {
      setProcedureError(
        getApiErrorMessage(err, "Erro ao criar procedimento. Tente novamente."),
      );
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

  const dropdown = showDropdown && (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999,
        ...(dropdownPosition.placement === "top"
          ? { bottom: dropdownPosition.bottom + 4 }
          : { top: dropdownPosition.top + 4 }),
      }}
      className="bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto scrollbar-mobile-visible"
    >
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
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo modelo"
      size="sm"
      disableClose={isLoading}
      footer={
        <ModalFooter>
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Limpar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading || !modelName.trim() || emTour}
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
        </ModalFooter>
      }
    >
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div
          className="flex flex-col gap-1.5"
          data-tour="procedimentos-modelo-nome"
        >
          <label htmlFor="novo-modelo-nome" className="ds-label mb-0">
            Nome do modelo <span className="text-red-500">*</span>
          </label>
          <Input
            id="novo-modelo-nome"
            ref={modelNameInputRef}
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="Ex: Artroplastia padrão Bradesco"
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="novo-modelo-procedimento" className="ds-label mb-0">
            Procedimento
          </label>
          <div className="relative" ref={anchorRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
            <Input
              id="novo-modelo-procedimento"
              type="text"
              value={procedureSearch}
              onChange={(e) => {
                setProcedureSearch(e.target.value);
                setSelectedProcedure(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar ou criar procedimento..."
              className="pl-9"
              disabled={isLoading}
            />
            {selectedProcedure && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
            )}
          </div>
          {dropdown &&
            typeof document !== "undefined" &&
            createPortal(dropdown, document.body)}
          {procedureError && (
            <p role="alert" className="text-xs text-red-600">
              {procedureError}
            </p>
          )}
          <span className="text-xs text-gray-400">
            Você poderá adicionar códigos TUSS, OPME e documentos após criar o
            modelo.
          </span>
        </div>
      </div>
    </Modal>
  );
}
