"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList,
  Search,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { tussService, TussCode } from "@/services/tuss.service";
import { logger } from "@/lib/logger";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TussProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
  existingProcedures?: Record<string, unknown>[];
  editingProcedure?: {
    id: string;
    procedureId: string;
    quantity: number;
    procedure: TussCode;
  } | null;
  /** Quando fornecido, salva localmente em vez de chamar a API. */
  onLocalSave?: (
    items: { tussCode: string; name: string; quantity: number }[],
  ) => void;
}

interface ProcedureItem {
  procedure: TussCode;
  quantity: number;
}

// ─── Debounce (com cancel) ────────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as typeof debounced & { cancel: () => void };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TussProcedureModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
  existingProcedures = [],
  onLocalSave,
}: TussProcedureModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TussCode[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { toast, showToast, hideToast } = useToast();

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setProcedures([]);
    setSearchTerm("");
    setSearchResults([]);
    setIsDropdownOpen(false);
    onClose();
  }, [isLoading, onClose]);

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(handleClose);

  // ── Inicializa o estado ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setProcedures([]);
    setSearchTerm("");
    setSearchResults([]);
    setIsDropdownOpen(false);
  }, [isOpen]);

  // ── ESC fecha
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  // ── Bloqueia scroll do body
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen]);

  // ── Busca debounced
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      setIsSearching(true);
      try {
        const results = await tussService.searchTussFromJson(term, 50);
        setSearchResults(results);
        setIsDropdownOpen(true);
      } catch (err) {
        logger.error("Erro na busca TUSS:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [isOpen, searchTerm, debouncedSearch]);

  const handleFocus = async () => {
    setIsDropdownOpen(true);
    if (searchResults.length === 0 && !isSearching) {
      setIsSearching(true);
      try {
        const results = await tussService.searchTussFromJson(searchTerm || "", 50);
        setSearchResults(results);
      } catch (err) {
        logger.error("Erro na busca TUSS:", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const addedTussCodes = new Set([
    ...procedures.map((p) => p.procedure.tussCode),
    ...existingProcedures
      .map((p: any) => p.tussCode ?? p.procedure?.tussCode)
      .filter(Boolean),
  ]);

  const filteredResults = searchResults.filter(
    (r) => !addedTussCodes.has(r.tussCode),
  );

  const handleSelectProcedure = (procedure: TussCode) => {
    if (addedTussCodes.has(procedure.tussCode)) {
      showToast(
        `O procedimento ${procedure.tussCode} já foi adicionado.`,
        "warning",
      );
      return;
    }
    setProcedures((prev) => [...prev, { procedure, quantity: 1 }]);
    setSearchTerm("");
    setSearchResults([]);
    setIsDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveProcedure = (index: number) => {
    setProcedures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityDelta = (index: number, delta: number) => {
    setProcedures((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const handleQuantitySet = (index: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    setProcedures((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: value } : item)),
    );
  };

  const handleSave = async () => {
    if (procedures.length === 0) {
      showToast("Adicione pelo menos um procedimento.", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (onLocalSave) {
        onLocalSave(
          procedures.map((item) => ({
            tussCode: item.procedure.tussCode,
            name: item.procedure.name,
            quantity: item.quantity,
          })),
        );
        onSuccess();
        handleClose();
        return;
      }

      await tussService.addProcedures({
        surgeryRequestId,
        procedures: procedures.map((item) => ({
          procedureId: item.procedure.id,
          tussCode: item.procedure.tussCode,
          name: item.procedure.name,
          quantity: item.quantity,
        })),
      });

      onSuccess();
      handleClose();
    } catch (err) {
      logger.error("Erro ao salvar procedimentos:", err);
      showToast("Erro ao salvar procedimentos. Tente novamente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDragging = dragY > 0;
  const overlayOpacity = isDragging ? Math.max(0.2, 1 - dragY / 300) : 1;

  const showDropdown = isDropdownOpen && (isSearching || filteredResults.length > 0);

  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-end md:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar procedimentos TUSS"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          style={{ opacity: overlayOpacity }}
          onClick={handleClose}
        />

        <div
          className="relative bg-white w-full md:max-w-2xl flex flex-col rounded-t-3xl md:rounded-2xl max-h-[92dvh] md:max-h-[85vh] animate-slide-up md:animate-scale-in md:mx-4 shadow-xl mobile-sheet-offset"
          style={
            isDragging
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
          <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-neutral-100 shrink-0">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 text-primary-700 shrink-0">
              <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="ds-modal-title">Procedimentos TUSS</h2>
              <p className="hidden sm:block ds-caption mt-0.5">
                Busque e adicione os procedimentos para esta cirurgia
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-11 min-w-11 flex items-center justify-center disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-3 md:gap-4">
              {/* Campo de busca */}
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleFocus}
                    placeholder="Buscar por código TUSS ou nome do procedimento..."
                    aria-label="Buscar procedimento TUSS"
                    className="ds-input pl-9 pr-9"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600 animate-spin" />
                  )}
                  {!isSearching && searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Limpar busca"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute z-60 top-full left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando procedimentos...
                      </div>
                    ) : filteredResults.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        Nenhum procedimento encontrado
                      </div>
                    ) : (
                      filteredResults.map((procedure) => (
                        <button
                          key={procedure.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectProcedure(procedure);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors border-b border-neutral-100 last:border-b-0 flex items-start gap-2"
                        >
                          <span className="ds-badge-sm bg-primary-50 text-primary-700 shrink-0 mt-0.5 font-mono">
                            {procedure.tussCode}
                          </span>
                          <span className="text-sm text-gray-900 leading-snug">
                            {procedure.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lista de procedimentos selecionados */}
              {procedures.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="ds-section-title">
                      Procedimentos selecionados
                    </span>
                    <span className="ds-badge-sm bg-primary-50 text-primary-700">
                      {procedures.length}{" "}
                      {procedures.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {procedures.map((item, index) => (
                      <ProcedureCard
                        key={`${item.procedure.tussCode}-${index}`}
                        item={item}
                        onIncrement={() => handleQuantityDelta(index, 1)}
                        onDecrement={() => handleQuantityDelta(index, -1)}
                        onQuantityChange={(value) =>
                          handleQuantitySet(index, value)
                        }
                        onRemove={() => handleRemoveProcedure(index)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ds-modal-footer shrink-0 rounded-b-3xl md:rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="ds-btn-outline"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || procedures.length === 0}
              className="ds-btn-primary inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  Adicionar
                  {procedures.length > 0 ? ` (${procedures.length})` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 md:py-10 px-4 gap-3">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 text-primary-700">
        <ClipboardList className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="text-sm md:text-base font-semibold text-gray-900">
          Nenhum procedimento selecionado
        </h3>
        <p className="ds-caption">
          Use o campo acima para buscar e adicionar os procedimentos
          desta cirurgia.
        </p>
      </div>
    </div>
  );
}

// ─── ProcedureCard ────────────────────────────────────────────────────────────

interface ProcedureCardProps {
  item: ProcedureItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onQuantityChange: (value: string) => void;
  onRemove: () => void;
}

function ProcedureCard({
  item,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onRemove,
}: ProcedureCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="ds-badge-sm bg-primary-50 text-primary-700 shrink-0 mt-0.5 font-mono">
          {item.procedure.tussCode}
        </span>
        <span className="text-sm text-gray-900 leading-snug min-w-0 break-words">
          {item.procedure.name}
        </span>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
        <span className="text-xs text-gray-500 sm:hidden">Quantidade</span>
        <div className="flex items-center gap-2">
          <QuantityStepper
            value={item.quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onChange={onQuantityChange}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover procedimento"
            title="Remover"
            className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QuantityStepper ──────────────────────────────────────────────────────────

function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onChange,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="w-4 h-4" strokeWidth={2} />
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Quantidade"
        className="w-12 h-9 md:h-10 text-center text-sm font-semibold text-gray-900 bg-transparent border-x border-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      />
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Aumentar quantidade"
        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}
