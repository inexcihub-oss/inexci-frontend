"use client";

import React, { useState, useEffect, useCallback } from "react";
import { tussService, TussCode } from "@/services/tuss.service";

// Função debounce customizada com método cancel
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debouncedFunction = function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  debouncedFunction.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debouncedFunction as typeof debouncedFunction & { cancel: () => void };
}

interface TussProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string;
  onSuccess: () => void;
  editingProcedure?: {
    id: string;
    procedure_id: string;
    quantity: number;
    procedure: TussCode;
  } | null;
}

interface ProcedureItem {
  id?: string;
  procedure: TussCode;
  quantity: number;
}

// Ícones SVG inline conforme Figma
const IconArrowDown = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.76 5.48L8 9.72L12.24 5.48"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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

const IconCheck = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
      fill="currentColor"
    />
  </svg>
);

const IconPlus = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z" fill="currentColor" />
  </svg>
);

const IconMinus = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 13V11H19V13H5Z" fill="currentColor" />
  </svg>
);

export function TussProcedureModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
  editingProcedure,
}: TussProcedureModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TussCode[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setProcedures([]);
      setSearchTerm("");
      setSearchResults([]);
      setEditingIndex(null);
      setTempQuantity(1);
      setNewItemQuantity(1);
      setError(null);
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await tussService.searchTussFromJson(term, 50);
        setSearchResults(results);
        setIsDropdownOpen(results.length > 0);
      } catch (err) {
        console.error("Erro na busca:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  if (!isOpen) return null;

  const handleSelectProcedure = (procedure: TussCode) => {
    setProcedures((prev) => [
      ...prev,
      { procedure, quantity: newItemQuantity },
    ]);
    setSearchTerm("");
    setSearchResults([]);
    setIsDropdownOpen(false);
    setNewItemQuantity(1);
  };

  const handleRemoveProcedure = (index: number) => {
    setProcedures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProcedure = (index: number) => {
    setEditingIndex(index);
    setTempQuantity(procedures[index].quantity);
  };

  const handleSaveEdit = (index: number) => {
    setProcedures((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: tempQuantity } : item,
      ),
    );
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setProcedures([]);
    setSearchTerm("");
    setSearchResults([]);
    setEditingIndex(null);
    setError(null);
    setIsDropdownOpen(false);
    onClose();
  };

  const handleSave = async () => {
    if (procedures.length === 0) {
      setError("Adicione pelo menos um procedimento.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await tussService.addProcedures({
        surgery_request_id: surgeryRequestId,
        procedures: procedures.map((item) => ({
          procedure_id: item.procedure.id,
          quantity: item.quantity,
        })),
      });

      onSuccess();
      handleCancel();
    } catch (err) {
      console.error("Erro ao salvar procedimentos:", err);
      setError("Erro ao salvar procedimentos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isLoading ? handleCancel : undefined}
      />

      {/* Modal - 800x650px conforme Figma */}
      <div
        className="relative bg-white rounded-lg shadow-xl flex flex-col"
        style={{ width: "800px", height: "650px" }}
      >
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-[#DCDFE3]">
          <h2
            className="flex-1 text-2xl font-light text-[#111111] tracking-tight"
            style={{
              fontFamily: "Gotham, Inter, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Novo Procedimento
          </h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Header da Tabela */}
          <div className="flex items-center gap-4 pl-6 pr-14 py-1 border-b border-[#DCDFE3]">
            <span className="flex-1 text-xs text-[#111111] opacity-50 text-left">
              Procedimento
            </span>
            <span
              className="text-xs text-[#111111] opacity-50"
              style={{ width: "148px" }}
            >
              Quantidade
            </span>
          </div>

          {/* Área de Scroll para Lista de Procedimentos */}
          <div className="flex-1 overflow-y-auto">
            {/* Lista de Procedimentos Adicionados */}
            {procedures.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-6 py-3 border-b border-[#DCDFE3]"
                style={{ height: "64px" }}
              >
                <div className="flex-1 flex items-center gap-6">
                  <span className="flex-1 text-sm text-[#111111]">
                    {item.procedure.tuss_code} - {item.procedure.name}
                  </span>
                  <span
                    className="text-xs text-[#111111]"
                    style={{ width: "148px" }}
                  >
                    {item.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditProcedure(index)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                    title="Editar"
                  >
                    <IconEdit className="w-5 h-5 text-[#111111]" />
                  </button>
                  <button
                    onClick={() => handleRemoveProcedure(index)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                    title="Remover"
                  >
                    <IconTrash className="w-5 h-5 text-[#E34935]" />
                  </button>
                </div>
              </div>
            ))}

            {/* Linha de Adição de Novo Procedimento */}
            <div
              className="flex items-center gap-4 px-6 py-3 border-b border-[#DCDFE3]"
              style={{ height: "64px" }}
            >
              <div className="flex-1 flex items-center gap-6">
                {/* Dropdown de Busca */}
                <div className="flex-1 relative">
                  <div className="flex items-center gap-2 px-3 py-2 border border-[#DCDFE3] rounded-lg bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Código ou nome do procedimento"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-[#111111] placeholder:text-[#111111] placeholder:opacity-50"
                    />
                    <IconArrowDown className="w-4 h-4 text-[#111111] opacity-50" />
                  </div>

                  {/* Dropdown de Resultados */}
                  {isDropdownOpen && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-[#DCDFE3] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((procedure) => (
                        <button
                          key={procedure.id}
                          type="button"
                          onClick={() => handleSelectProcedure(procedure)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-[#DCDFE3] last:border-b-0"
                        >
                          <p className="text-sm font-medium text-[#111111]">
                            {procedure.tuss_code} - {procedure.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Loading */}
                  {isSearching && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-[#DCDFE3] rounded-lg shadow-lg p-4 text-center">
                      <span className="text-sm text-[#111111] opacity-50">
                        Buscando...
                      </span>
                    </div>
                  )}
                </div>

                {/* Controles de Quantidade */}
                <div
                  className="flex items-center gap-2"
                  style={{ width: "148px" }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setNewItemQuantity((prev) => Math.max(1, prev - 1))
                    }
                    disabled={newItemQuantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <IconMinus className="w-5 h-5 text-[#111111] opacity-50" />
                  </button>
                  <div
                    className="flex items-center justify-center px-3 py-2 border border-[#DCDFE3] rounded-lg bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                    style={{ width: "52px", height: "40px" }}
                  >
                    <span className="text-sm font-semibold text-[#111111]">
                      {newItemQuantity}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewItemQuantity((prev) => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <IconPlus className="w-5 h-5 text-[#111111]" />
                  </button>
                </div>
              </div>

              {/* Espaço para alinhar com as ações */}
              <div style={{ width: "78px" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-3 py-4 border-t-2 border-[#DCDFE3]">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-normal text-[#111111] bg-white border-2 border-[#DCDFE3] rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#147471] rounded-lg hover:bg-[#0f5c5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || procedures.length === 0}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Salvando...
              </span>
            ) : (
              "Adicionar"
            )}
          </button>
        </div>
      </div>

      {/* Modal de Edição de Quantidade */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setEditingIndex(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-4 flex items-center gap-3">
            <button
              onClick={() => setTempQuantity((prev) => Math.max(1, prev - 1))}
              disabled={tempQuantity <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <IconMinus className="w-5 h-5 text-[#111111]" />
            </button>
            <div
              className="px-3 py-2 text-center text-sm font-semibold text-[#111111] border border-[#DCDFE3] rounded-lg bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              style={{ width: "52px" }}
            >
              {tempQuantity}
            </div>
            <button
              onClick={() => setTempQuantity((prev) => prev + 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <IconPlus className="w-5 h-5 text-[#111111]" />
            </button>
            <button
              onClick={() => handleSaveEdit(editingIndex)}
              className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-[#147471] rounded-lg hover:bg-[#0f5c5a] transition-colors"
            >
              <IconCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
