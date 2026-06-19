"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  ChevronDown,
  Copy,
  Pencil,
  Trash2,
  Plus,
  Minus,
  X,
  Package,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  opmeService,
  OpmeItem,
  CreateOpmeData,
  OpmeSupplier,
} from "@/services/opme.service";
import { logger } from "@/lib/logger";
import { getApiErrorMessage } from "@/lib/http-error";
import { supplierService } from "@/services/supplier.service";
import {
  manufacturerService,
  Manufacturer,
} from "@/services/manufacturer.service";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SupplierOption {
  id?: string;
  name: string;
}

interface OpmeItemForm {
  id?: string;
  name: string;
  manufacturers: string[];
  suppliers: SupplierOption[];
  quantity: number;
}

interface OpmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
  editingOpme?: OpmeItem | null;
  /** Quando fornecido, salva localmente em vez de chamar a API */
  onLocalSave?: (
    items: {
      name: string;
      manufacturers: string[];
      suppliers: string[];
      quantity: number;
    }[],
  ) => void;
  /** Pré-popula os itens ao abrir em modo local */
  initialItems?: {
    name: string;
    manufacturers: string[];
    suppliers: string[];
    quantity: number;
  }[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MIN_OPTIONS = 3;

function emptySupplierSlots(): SupplierOption[] {
  return Array.from({ length: MIN_OPTIONS }, () => ({ name: "" }));
}

function emptyManufacturerSlots(): string[] {
  return Array.from({ length: MIN_OPTIONS }, () => "");
}

function padManufacturers(items: string[]): string[] {
  if (items.length >= MIN_OPTIONS) return items;
  return [
    ...items,
    ...Array.from({ length: MIN_OPTIONS - items.length }, () => ""),
  ];
}

function padSuppliers(items: SupplierOption[]): SupplierOption[] {
  if (items.length >= MIN_OPTIONS) return items;
  return [
    ...items,
    ...Array.from({ length: MIN_OPTIONS - items.length }, () => ({ name: "" })),
  ];
}

function normalizeOptionName(name: string): string {
  return name.trim().toLowerCase();
}

function formatCreatedNames(names: string[]): string {
  if (names.length <= 4) {
    return names.join(", ");
  }

  const visible = names.slice(0, 4).join(", ");
  return `${visible} e mais ${names.length - 4}`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OpmeModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
  editingOpme,
  onLocalSave,
  initialItems,
}: OpmeModalProps) {
  const [opmeItems, setOpmeItems] = useState<OpmeItemForm[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [newOpmeName, setNewOpmeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableSuppliers, setAvailableSuppliers] = useState<OpmeSupplier[]>(
    [],
  );
  const [availableManufacturers, setAvailableManufacturers] = useState<
    Manufacturer[]
  >([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { toast, showToast, hideToast } = useToast();
  const handleClose = useCallback(() => {
    if (isLoading) return;
    setOpmeItems([]);
    setExpandedIndex(null);
    setEditingNameIndex(null);
    setNewOpmeName("");
    setSaveError(null);
    onClose();
  }, [isLoading, onClose]);

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(handleClose);

  // ── Carrega listas para autocomplete ao abrir
  useEffect(() => {
    if (!isOpen) return;

    Promise.allSettled([supplierService.getAll(), manufacturerService.getAll()])
      .then(([suppliersResult, manufacturersResult]) => {
        if (suppliersResult.status === "fulfilled") {
          setAvailableSuppliers(
            suppliersResult.value.map((s) => ({ id: s.id, name: s.name })),
          );
        }

        if (manufacturersResult.status === "fulfilled") {
          setAvailableManufacturers(manufacturersResult.value);
        }
      })
      .catch(() => {
        // Falha silenciosa: comboboxes seguem funcionando como texto livre.
      });
  }, [isOpen]);

  // ── Inicializa o formulário ao abrir
  useEffect(() => {
    if (!isOpen) return;
    if (editingOpme) {
      const existingSuppliers: SupplierOption[] =
        editingOpme.suppliers?.map((s) => ({ id: s.id, name: s.name })) ?? [];

      const existingManufacturers =
        editingOpme.manufacturers?.map((m) => m.name).filter(Boolean) ??
        (editingOpme.brand ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      setOpmeItems([
        {
          id: editingOpme.id,
          name: editingOpme.name,
          manufacturers: padManufacturers(existingManufacturers),
          suppliers: padSuppliers(existingSuppliers),
          quantity: editingOpme.quantity,
        },
      ]);
      setExpandedIndex(0);
    } else if (initialItems && initialItems.length > 0) {
      setOpmeItems(
        initialItems.map((item) => ({
          name: item.name,
          manufacturers: padManufacturers([...item.manufacturers]),
          suppliers: padSuppliers(item.suppliers.map((name) => ({ name }))),
          quantity: item.quantity,
        })),
      );
      setExpandedIndex(0);
    } else {
      setOpmeItems([]);
      setExpandedIndex(null);
    }
    setNewOpmeName("");
    setEditingNameIndex(null);
  }, [isOpen, editingOpme, initialItems]);

  // ── ESC fecha o modal
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

  // ── Handlers de itens

  const handleAddOpme = () => {
    const name = newOpmeName.trim();
    if (!name) return;
    const newItem: OpmeItemForm = {
      name,
      manufacturers: emptyManufacturerSlots(),
      suppliers: emptySupplierSlots(),
      quantity: 1,
    };
    setOpmeItems((prev) => {
      const next = [...prev, newItem];
      setExpandedIndex(next.length - 1);
      return next;
    });
    setNewOpmeName("");
  };

  const handleRemoveOpme = (index: number) => {
    setOpmeItems((prev) => prev.filter((_, i) => i !== index));
    setExpandedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    if (editingNameIndex === index) setEditingNameIndex(null);
  };

  const handleDuplicateOpme = (index: number) => {
    setOpmeItems((prev) => {
      const next = [
        ...prev,
        {
          ...prev[index],
          id: undefined,
          name: `${prev[index].name} (cópia)`,
        },
      ];
      setExpandedIndex(next.length - 1);
      return next;
    });
  };

  const updateItem = (index: number, updates: Partial<OpmeItemForm>) => {
    setOpmeItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const handleRenameOpme = (index: number, name: string) => {
    updateItem(index, { name });
  };

  const handleManufacturerChange = (
    itemIndex: number,
    fieldIndex: number,
    value: string,
  ) => {
    setOpmeItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const next = [...item.manufacturers];
        next[fieldIndex] = value;
        return { ...item, manufacturers: next };
      }),
    );
  };

  const handleAddManufacturer = (itemIndex: number) => {
    setOpmeItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, manufacturers: [...item.manufacturers, ""] }
          : item,
      ),
    );
  };

  const handleRemoveManufacturer = (itemIndex: number, fieldIndex: number) => {
    setOpmeItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        if (item.manufacturers.length <= MIN_OPTIONS) return item;
        return {
          ...item,
          manufacturers: item.manufacturers.filter((_, j) => j !== fieldIndex),
        };
      }),
    );
  };

  const handleSupplierChange = (
    itemIndex: number,
    fieldIndex: number,
    value: SupplierOption,
  ) => {
    setOpmeItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const next = [...item.suppliers];
        next[fieldIndex] = value;
        return { ...item, suppliers: next };
      }),
    );
  };

  const handleAddSupplier = (itemIndex: number) => {
    setOpmeItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, suppliers: [...item.suppliers, { name: "" }] }
          : item,
      ),
    );
  };

  const handleRemoveSupplier = (itemIndex: number, fieldIndex: number) => {
    setOpmeItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        if (item.suppliers.length <= MIN_OPTIONS) return item;
        return {
          ...item,
          suppliers: item.suppliers.filter((_, j) => j !== fieldIndex),
        };
      }),
    );
  };

  const handleQuantityChange = (itemIndex: number, delta: number) => {
    setOpmeItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const handleQuantitySet = (itemIndex: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    updateItem(itemIndex, { quantity: value });
  };

  // ── Validação e submit

  const validate = (): { ok: boolean; failingIndex: number | null } => {
    for (let i = 0; i < opmeItems.length; i++) {
      const item = opmeItems[i];
      const manufacturers = item.manufacturers.filter((m) => m.trim()).length;
      const suppliers = item.suppliers.filter((s) => s.name.trim()).length;
      if (manufacturers < MIN_OPTIONS || suppliers < MIN_OPTIONS) {
        return { ok: false, failingIndex: i };
      }
    }
    return { ok: true, failingIndex: null };
  };

  const handleSave = async () => {
    setSaveError(null);

    if (opmeItems.length === 0) {
      showToast("Adicione pelo menos um item OPME.", "error");
      return;
    }

    const { ok, failingIndex } = validate();
    if (!ok) {
      const item = opmeItems[failingIndex ?? 0];
      showToast(
        `O material "${item.name}" precisa de no mínimo ${MIN_OPTIONS} fabricantes e ${MIN_OPTIONS} fornecedores preenchidos.`,
        "error",
      );
      setExpandedIndex(failingIndex);
      return;
    }

    let savingItemIndex: number | null = null;

    setIsLoading(true);
    try {
      const createdSupplierNames = new Set<string>();
      const createdManufacturerNames = new Set<string>();

      if (onLocalSave) {
        onLocalSave(
          opmeItems.map((item) => ({
            name: item.name,
            manufacturers: item.manufacturers.filter((m) => m.trim()),
            suppliers: item.suppliers
              .filter((s) => s.name.trim())
              .map((s) => s.name),
            quantity: item.quantity,
          })),
        );
        onSuccess();
        handleClose();
        return;
      }

      for (const [index, item] of opmeItems.entries()) {
        savingItemIndex = index;

        const filledManufacturers = item.manufacturers
          .map((name) => name.trim())
          .filter(Boolean);
        const availableManufacturerByName = new Map(
          availableManufacturers.map((manufacturer) => [
            normalizeOptionName(manufacturer.name),
            manufacturer,
          ]),
        );

        const manufacturerIds: string[] = [];
        const manufacturerNames: string[] = [];

        for (const manufacturerName of filledManufacturers) {
          const existingManufacturer = availableManufacturerByName.get(
            normalizeOptionName(manufacturerName),
          );

          if (existingManufacturer?.id) {
            manufacturerIds.push(existingManufacturer.id);
          } else {
            manufacturerNames.push(manufacturerName);
          }
        }

        const filledSuppliers = item.suppliers.filter((s) => s.name.trim());
        const supplierIds = filledSuppliers
          .filter((s) => s.id)
          .map((s) => s.id!);
        const supplierNames = filledSuppliers
          .filter((s) => !s.id)
          .map((s) => s.name.trim());

        const data: CreateOpmeData = {
          surgeryRequestId,
          name: item.name,
          manufacturerIds:
            manufacturerIds.length > 0
              ? Array.from(new Set(manufacturerIds))
              : undefined,
          manufacturerNames:
            manufacturerNames.length > 0
              ? Array.from(new Set(manufacturerNames))
              : undefined,
          supplierIds: supplierIds.length > 0 ? supplierIds : undefined,
          supplierNames: supplierNames.length > 0 ? supplierNames : undefined,
          quantity: item.quantity,
        };

        if (item.id) {
          const response = await opmeService.update({
            id: item.id,
            name: data.name,
            manufacturerIds: data.manufacturerIds,
            manufacturerNames: data.manufacturerNames,
            supplierIds: data.supplierIds,
            supplierNames: data.supplierNames,
            quantity: data.quantity,
          });

          response.createdSupplierNames?.forEach((name) =>
            createdSupplierNames.add(name),
          );
          response.createdManufacturerNames?.forEach((name) =>
            createdManufacturerNames.add(name),
          );
        } else {
          const response = await opmeService.create(data);

          response.createdSupplierNames?.forEach((name) =>
            createdSupplierNames.add(name),
          );
          response.createdManufacturerNames?.forEach((name) =>
            createdManufacturerNames.add(name),
          );
        }
      }

      const createdSuppliers = Array.from(createdSupplierNames);
      const createdManufacturers = Array.from(createdManufacturerNames);

      if (createdSuppliers.length > 0 || createdManufacturers.length > 0) {
        const parts: string[] = [];
        if (createdSuppliers.length > 0) {
          parts.push(
            `Fornecedores criados: ${formatCreatedNames(createdSuppliers)}`,
          );
        }
        if (createdManufacturers.length > 0) {
          parts.push(
            `Fabricantes criados: ${formatCreatedNames(createdManufacturers)}`,
          );
        }

        showToast(parts.join(" · "), "success");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      logger.error("Erro ao salvar OPME:", err);

      const message = getApiErrorMessage(
        err,
        "Erro ao salvar OPME. Revise os dados e tente novamente.",
      );

      setSaveError(message);
      if (savingItemIndex !== null) {
        setExpandedIndex(savingItemIndex);
      }
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDragging = dragY > 0;
  const overlayOpacity = isDragging ? Math.max(0.2, 1 - dragY / 300) : 1;

  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-end md:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Materiais OPME"
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
              <Package className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="ds-modal-title">Materiais OPME</h2>
              <p className="hidden sm:block ds-caption mt-0.5">
                Configure os materiais necessários para esta cirurgia
              </p>
            </div>
            <button
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
              <AddOpmeRow
                value={newOpmeName}
                onChange={setNewOpmeName}
                onConfirm={handleAddOpme}
              />

              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {opmeItems.length === 0 ? (
                <EmptyState />
              ) : (
                opmeItems.map((item, index) => (
                  <OpmeItemCard
                    key={index}
                    item={item}
                    expanded={expandedIndex === index}
                    isEditingName={editingNameIndex === index}
                    onToggleExpand={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                    onStartEditName={() => setEditingNameIndex(index)}
                    onFinishEditName={() => setEditingNameIndex(null)}
                    onRename={(name) => handleRenameOpme(index, name)}
                    onDuplicate={() => handleDuplicateOpme(index)}
                    onRemove={() => handleRemoveOpme(index)}
                    onQuantityDelta={(delta) =>
                      handleQuantityChange(index, delta)
                    }
                    onQuantitySet={(value) => handleQuantitySet(index, value)}
                    onManufacturerChange={(fieldIndex, value) =>
                      handleManufacturerChange(index, fieldIndex, value)
                    }
                    onAddManufacturer={() => handleAddManufacturer(index)}
                    onRemoveManufacturer={(fieldIndex) =>
                      handleRemoveManufacturer(index, fieldIndex)
                    }
                    onSupplierChange={(fieldIndex, value) =>
                      handleSupplierChange(index, fieldIndex, value)
                    }
                    onAddSupplier={() => handleAddSupplier(index)}
                    onRemoveSupplier={(fieldIndex) =>
                      handleRemoveSupplier(index, fieldIndex)
                    }
                    availableSuppliers={availableSuppliers}
                    availableManufacturers={availableManufacturers}
                  />
                ))
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
              disabled={isLoading || opmeItems.length === 0}
              className="ds-btn-primary inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 md:py-10 px-4 gap-3">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 text-primary-700">
        <Package className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="text-sm md:text-base font-semibold text-gray-900">
          Nenhum material adicionado
        </h3>
        <p className="ds-caption">
          Use o campo acima para adicionar os materiais OPME necessários para
          esta solicitação.
        </p>
      </div>
    </div>
  );
}

// ─── Input de adicionar OPME (sempre visível) ────────────────────────────────

function AddOpmeRow({
  value,
  onChange,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const canAdd = value.trim().length > 0;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white p-1.5 pl-3 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-colors">
      <Plus className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
          }
        }}
        placeholder="Nome do material..."
        aria-label="Nome do material OPME"
        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 py-1.5"
      />
      <button
        type="button"
        onClick={onConfirm}
        disabled={!canAdd}
        className="ds-btn-primary h-8 md:h-9 min-h-0 inline-flex items-center gap-1.5 shrink-0"
      >
        <Check className="w-4 h-4" strokeWidth={2} />
        <span className="hidden sm:inline">Adicionar</span>
      </button>
    </div>
  );
}

// ─── OpmeItemCard ─────────────────────────────────────────────────────────────

interface OpmeItemCardProps {
  item: OpmeItemForm;
  expanded: boolean;
  isEditingName: boolean;
  availableSuppliers: OpmeSupplier[];
  availableManufacturers: Manufacturer[];
  onToggleExpand: () => void;
  onStartEditName: () => void;
  onFinishEditName: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onQuantityDelta: (delta: number) => void;
  onQuantitySet: (value: string) => void;
  onManufacturerChange: (index: number, value: string) => void;
  onAddManufacturer: () => void;
  onRemoveManufacturer: (index: number) => void;
  onSupplierChange: (index: number, value: SupplierOption) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (index: number) => void;
}

function OpmeItemCard({
  item,
  expanded,
  isEditingName,
  availableSuppliers,
  availableManufacturers,
  onToggleExpand,
  onStartEditName,
  onFinishEditName,
  onRename,
  onDuplicate,
  onRemove,
  onQuantityDelta,
  onQuantitySet,
  onManufacturerChange,
  onAddManufacturer,
  onRemoveManufacturer,
  onSupplierChange,
  onAddSupplier,
  onRemoveSupplier,
}: OpmeItemCardProps) {
  const filledManufacturers = useMemo(
    () => item.manufacturers.filter((m) => m.trim()).length,
    [item.manufacturers],
  );
  const filledSuppliers = useMemo(
    () => item.suppliers.filter((s) => s.name.trim()).length,
    [item.suppliers],
  );

  const getAvailableSuppliersForIndex = useCallback(
    (fieldIndex: number) => {
      const selectedIds = new Set(
        item.suppliers
          .filter((_, i) => i !== fieldIndex)
          .map((s) => s.id)
          .filter((id): id is string => Boolean(id)),
      );

      const selectedNames = new Set(
        item.suppliers
          .filter((_, i) => i !== fieldIndex)
          .map((s) => normalizeOptionName(s.name))
          .filter(Boolean),
      );

      return availableSuppliers.filter((supplier) => {
        if (selectedIds.has(supplier.id)) return false;
        return !selectedNames.has(normalizeOptionName(supplier.name));
      });
    },
    [item.suppliers, availableSuppliers],
  );

  const getAvailableManufacturersForIndex = useCallback(
    (fieldIndex: number) => {
      const selectedNames = new Set(
        item.manufacturers
          .filter((_, i) => i !== fieldIndex)
          .map((name) => normalizeOptionName(name))
          .filter(Boolean),
      );

      return availableManufacturers.filter(
        (manufacturer) =>
          !selectedNames.has(normalizeOptionName(manufacturer.name)),
      );
    },
    [item.manufacturers, availableManufacturers],
  );

  const isComplete =
    filledManufacturers >= MIN_OPTIONS && filledSuppliers >= MIN_OPTIONS;

  return (
    <div
      className={`rounded-2xl border bg-white overflow-visible transition-colors ${
        expanded ? "border-primary-200" : "border-neutral-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 text-left p-2 -m-2 rounded-xl hover:bg-gray-50 transition-colors"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${
              expanded ? "" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
          {isEditingName ? (
            <input
              autoFocus
              type="text"
              value={item.name}
              onChange={(e) => onRename(e.target.value)}
              onBlur={onFinishEditName}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  onFinishEditName();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="ds-input flex-1 min-w-0"
            />
          ) : (
            <span className="flex-1 truncate text-sm md:text-base font-semibold text-gray-900">
              {item.name}
            </span>
          )}
          <span
            className={`hidden sm:inline-flex items-center gap-1 ds-badge-sm ${
              isComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
            title={
              isComplete
                ? "Material configurado"
                : `Faltam ${Math.max(
                    0,
                    MIN_OPTIONS - filledManufacturers,
                  )} fabricante(s) e ${Math.max(
                    0,
                    MIN_OPTIONS - filledSuppliers,
                  )} fornecedor(es)`
            }
          >
            {isComplete ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Completo
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" strokeWidth={2} />
                Pendente
              </>
            )}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 ds-badge-sm bg-gray-50 text-gray-700 border border-neutral-100">
            <span className="text-gray-500">Qnt:</span>
            <span className="font-semibold">{item.quantity}</span>
          </span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onStartEditName();
            }}
            label="Renomear"
          >
            <Pencil className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            label="Duplicar"
          >
            <Copy className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            label="Remover"
            tone="danger"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      {/* Body (expanded) */}
      {expanded && (
        <div className="border-t border-neutral-100 bg-gray-50/60 p-3 md:p-4 flex flex-col gap-4 md:gap-5">
          {/* Quantidade */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="ds-label mb-0">Quantidade</span>
              <span className="ds-caption mt-0.5">
                Total de unidades necessárias
              </span>
            </div>
            <QuantityStepper
              value={item.quantity}
              onIncrement={() => onQuantityDelta(1)}
              onDecrement={() => onQuantityDelta(-1)}
              onChange={onQuantitySet}
            />
          </div>

          {/* Fabricantes */}
          <FieldGroup
            title="Fabricantes"
            description={`Informe ao menos ${MIN_OPTIONS} fabricantes`}
            filled={filledManufacturers}
            min={MIN_OPTIONS}
          >
            {item.manufacturers.map((manufacturer, fieldIndex) => (
              <div key={fieldIndex} className="flex items-center gap-2">
                <ManufacturerAutocomplete
                  value={manufacturer}
                  availableManufacturers={getAvailableManufacturersForIndex(
                    fieldIndex,
                  )}
                  onChange={(val) => onManufacturerChange(fieldIndex, val)}
                  placeholder={`Fabricante ${fieldIndex + 1}`}
                />
                <RemoveFieldButton
                  onClick={() => onRemoveManufacturer(fieldIndex)}
                  disabled={item.manufacturers.length <= MIN_OPTIONS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddManufacturer}
              className="ds-btn-inline self-start inline-flex items-center gap-1.5 text-primary-700"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Adicionar fabricante
            </button>
          </FieldGroup>

          {/* Fornecedores */}
          <FieldGroup
            title="Fornecedores"
            description={`Informe ao menos ${MIN_OPTIONS} fornecedores`}
            filled={filledSuppliers}
            min={MIN_OPTIONS}
          >
            {item.suppliers.map((supplier, fieldIndex) => (
              <div key={fieldIndex} className="flex items-center gap-2">
                <SupplierAutocomplete
                  value={supplier}
                  placeholder={`Fornecedor ${fieldIndex + 1}`}
                  availableSuppliers={getAvailableSuppliersForIndex(fieldIndex)}
                  onChange={(val) => onSupplierChange(fieldIndex, val)}
                />
                <RemoveFieldButton
                  onClick={() => onRemoveSupplier(fieldIndex)}
                  disabled={item.suppliers.length <= MIN_OPTIONS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddSupplier}
              className="ds-btn-inline self-start inline-flex items-center gap-1.5 text-primary-700"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Adicionar fornecedor
            </button>
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes auxiliares ───────────────────────────────────────────────

function IconButton({
  onClick,
  label,
  tone = "default",
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-500 hover:bg-red-50 hover:text-red-600"
      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function FieldGroup({
  title,
  description,
  filled,
  min,
  children,
}: {
  title: string;
  description: string;
  filled: number;
  min: number;
  children: React.ReactNode;
}) {
  const isComplete = filled >= min;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="ds-label mb-0">{title}</span>
          <span className="ds-caption mt-0.5">{description}</span>
        </div>
        <span
          className={`ds-badge-sm ${
            isComplete
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {filled}/{min}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function RemoveFieldButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Remover campo"
      className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

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

// ─── SupplierAutocomplete ─────────────────────────────────────────────────────

interface SupplierAutocompleteProps {
  value: SupplierOption;
  placeholder: string;
  availableSuppliers: OpmeSupplier[];
  onChange: (value: SupplierOption) => void;
}

function SupplierAutocomplete({
  value,
  placeholder,
  availableSuppliers,
  onChange,
}: SupplierAutocompleteProps) {
  const [query, setQuery] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value.name);
  }, [value.name]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (query.trim() !== value.name) {
          onChange({ name: query.trim() });
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value.name, onChange]);

  const filtered = availableSuppliers.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  const hasExactMatch = availableSuppliers.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const handleSelect = (supplier: OpmeSupplier) => {
    onChange({ id: supplier.id, name: supplier.name });
    setQuery(supplier.name);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const name = query.trim();
    if (!name) return;
    onChange({ name });
    setIsOpen(false);
  };

  const showDropdown =
    isOpen && (filtered.length > 0 || (query.trim() && !hasExactMatch));

  return (
    <div ref={containerRef} className="flex-1 min-w-0 relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value.id && e.target.value !== value.name) {
              onChange({ name: e.target.value });
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`ds-input pr-8 ${
            value.id ? "border-primary-300 bg-primary-50/30" : ""
          }`}
        />
        {value.id && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"
            title="Fornecedor cadastrado"
            aria-hidden="true"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-60 top-full left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {query.trim() && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-primary-700 font-semibold hover:bg-primary-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="truncate">
                Adicionar &ldquo;{query.trim()}&rdquo; como novo fornecedor
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ManufacturerAutocompleteProps {
  value: string;
  placeholder: string;
  availableManufacturers: Manufacturer[];
  onChange: (value: string) => void;
}

function ManufacturerAutocomplete({
  value,
  placeholder,
  availableManufacturers,
  onChange,
}: ManufacturerAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (query.trim() !== value) {
          onChange(query.trim());
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value, onChange]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = availableManufacturers.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  const matchedManufacturer = availableManufacturers.find(
    (m) => m.name.toLowerCase() === normalizedQuery,
  );

  const handleSelect = (manufacturer: Manufacturer) => {
    onChange(manufacturer.name);
    setQuery(manufacturer.name);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const name = query.trim();
    if (!name) return;
    onChange(name);
    setIsOpen(false);
  };

  const showDropdown =
    isOpen && (filtered.length > 0 || (query.trim() && !matchedManufacturer));

  return (
    <div ref={containerRef} className="flex-1 min-w-0 relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`ds-input pr-8 ${
            matchedManufacturer ? "border-primary-300 bg-primary-50/30" : ""
          }`}
        />
        {matchedManufacturer && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"
            title="Fabricante cadastrado"
            aria-hidden="true"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-60 top-full left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(m);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
          {query.trim() && !matchedManufacturer && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-primary-700 font-semibold hover:bg-primary-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="truncate">
                Adicionar &ldquo;{query.trim()}&rdquo; como novo fabricante
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
