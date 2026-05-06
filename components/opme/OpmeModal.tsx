"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  opmeService,
  OpmeItem,
  CreateOpmeData,
  OpmeSupplier,
} from "@/services/opme.service";
import { supplierService } from "@/services/supplier.service";

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

// ─── Ícones ───────────────────────────────────────────────────────────────────

const IconClose = ({ className = "" }: { className?: string }) => (
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

const IconCopy = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 18C8.45 18 7.97917 17.8042 7.5875 17.4125C7.19583 17.0208 7 16.55 7 16V4C7 3.45 7.19583 2.97917 7.5875 2.5875C7.97917 2.19583 8.45 2 9 2H18C18.55 2 19.0208 2.19583 19.4125 2.5875C19.8042 2.97917 20 3.45 20 4V16C20 16.55 19.8042 17.0208 19.4125 17.4125C19.0208 17.8042 18.55 18 18 18H9ZM9 16H18V4H9V16ZM5 22C4.45 22 3.97917 21.8042 3.5875 21.4125C3.19583 21.0208 3 20.55 3 20V7C3 6.71667 3.09583 6.47917 3.2875 6.2875C3.47917 6.09583 3.71667 6 4 6C4.28333 6 4.52083 6.09583 4.7125 6.2875C4.90417 6.47917 5 6.71667 5 7V20H15C15.2833 20 15.5208 20.0958 15.7125 20.2875C15.9042 20.4792 16 20.7167 16 21C16 21.2833 15.9042 21.5208 15.7125 21.7125C15.5208 21.9042 15.2833 22 15 22H5Z"
      fill="currentColor"
    />
    <path d="M13.5 8H14.5V12H13.5V8Z" fill="currentColor" />
    <path d="M12 9.5V10.5H16V9.5H12Z" fill="currentColor" />
  </svg>
);

const IconEdit = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
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
    width="20"
    height="20"
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

const IconEmptyOpme = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="2.75"
      y="2.75"
      width="26.5"
      height="26.5"
      rx="3.25"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M8 10H24M8 16H24M8 22H17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M22 20V26M19 23H25"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Accordion ────────────────────────────────────────────────────────────────

interface AccordionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, isOpen, onToggle, children }: AccordionProps) {
  return (
    <div className="border-b border-neutral-100 w-full">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-4 py-2 ${isOpen ? "border-b border-neutral-100" : ""}`}
      >
        <span className="text-sm md:text-base font-semibold text-neutral-900">
          {title}
        </span>
        <div
          className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <IconArrowDown className="w-4 h-4 text-neutral-900" />
        </div>
      </button>
      {isOpen && <div className="bg-neutral-50 p-4 space-y-6">{children}</div>}
    </div>
  );
}

// ─── SupplierCombobox ─────────────────────────────────────────────────────────

interface SupplierComboboxProps {
  value: SupplierOption;
  onChange: (value: SupplierOption) => void;
  availableSuppliers: OpmeSupplier[];
  label: string;
}

function SupplierCombobox({
  value,
  onChange,
  availableSuppliers,
  label,
}: SupplierComboboxProps) {
  const [query, setQuery] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value.name);
  }, [value.name]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        // Confirm free-text entry when clicking outside
        if (query.trim() !== value.name) {
          if (query.trim()) {
            onChange({ name: query.trim() });
          } else {
            onChange({ name: "" });
          }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Clear ID if user is typing a different name
    if (value.id && val !== value.name) {
      onChange({ name: val });
    }
    setIsOpen(true);
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
    <div ref={containerRef} className="space-y-1 relative">
      <label className="ds-label mb-0">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar ou digitar fornecedor..."
          className={`ds-input pr-8 ${value.id ? "border-primary-300 bg-primary-50/30" : ""}`}
        />
        {value.id && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"
            title="Fornecedor cadastrado"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className="w-full text-left px-3 py-2 text-xs text-neutral-900 hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
              {s.name}
            </button>
          ))}
          {query.trim() && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="w-full text-left px-3 py-2 text-xs text-primary-700 font-semibold hover:bg-primary-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
            >
              <IconPlus className="w-3 h-3" />
              Adicionar &ldquo;{query.trim()}&rdquo; como novo fornecedor
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_OPTIONS = 3;

function emptySupplierSlots(): SupplierOption[] {
  return Array.from({ length: MIN_OPTIONS }, () => ({ name: "" }));
}

function padToMin(suppliers: SupplierOption[]): SupplierOption[] {
  if (suppliers.length >= MIN_OPTIONS) return suppliers;
  return [
    ...suppliers,
    ...Array.from({ length: MIN_OPTIONS - suppliers.length }, () => ({
      name: "",
    })),
  ];
}

// ─── OpmeModal ────────────────────────────────────────────────────────────────

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
  const [selectedOpmeIndex, setSelectedOpmeIndex] = useState<number | null>(
    null,
  );
  const [newOpmeName, setNewOpmeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [isAddingOpme, setIsAddingOpme] = useState(false);
  const [availableSuppliers, setAvailableSuppliers] = useState<OpmeSupplier[]>(
    [],
  );

  const [manufacturersOpen, setManufacturersOpen] = useState(true);
  const [suppliersOpen, setSuppliersOpen] = useState(true);
  const [quantityOpen, setQuantityOpen] = useState(true);

  // Fetch suppliers once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    supplierService
      .getAll()
      .then((list) => {
        setAvailableSuppliers(list.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {
        // If fetch fails, combobox still works as free-text
      });
  }, [isOpen]);

  // Deve ficar antes do early return para não violar regras de hooks
  const handleSupplierChange = useCallback(
    (optionIndex: number, value: SupplierOption) => {
      setOpmeItems((prev) => {
        if (selectedOpmeIndex === null) return prev;
        return prev.map((item, i) => {
          if (i !== selectedOpmeIndex) return item;
          const next = [...item.suppliers];
          next[optionIndex] = value;
          return { ...item, suppliers: next };
        });
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [selectedOpmeIndex],
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingOpme) {
        const existingSuppliers: SupplierOption[] =
          editingOpme.suppliers?.map((s) => ({
            id: s.id,
            name: s.name,
          })) ?? [];
        setOpmeItems([
          {
            id: editingOpme.id,
            name: editingOpme.name,
            manufacturers: (() => {
              const items = (editingOpme.brand ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              while (items.length < MIN_OPTIONS) items.push("");
              return items;
            })(),
            suppliers: padToMin(existingSuppliers),
            quantity: editingOpme.quantity,
          },
        ]);
        setSelectedOpmeIndex(0);
      } else if (initialItems && initialItems.length > 0) {
        setOpmeItems(
          initialItems.map((item) => ({
            name: item.name,
            manufacturers:
              item.manufacturers.length >= MIN_OPTIONS
                ? [...item.manufacturers]
                : [
                    ...item.manufacturers,
                    ...Array(MIN_OPTIONS - item.manufacturers.length).fill(""),
                  ],
            suppliers: padToMin(item.suppliers.map((name) => ({ name }))),
            quantity: item.quantity,
          })),
        );
        setSelectedOpmeIndex(0);
      } else {
        setOpmeItems([]);
        setSelectedOpmeIndex(null);
      }
      setNewOpmeName("");
      setError(null);
    }
  }, [isOpen, editingOpme, initialItems]);

  if (!isOpen) return null;

  const handleAddOpme = () => {
    if (!newOpmeName.trim()) return;
    const newItem: OpmeItemForm = {
      name: newOpmeName.trim(),
      manufacturers: ["", "", ""],
      suppliers: emptySupplierSlots(),
      quantity: 1,
    };
    setOpmeItems((prev) => [...prev, newItem]);
    setSelectedOpmeIndex(opmeItems.length);
    setNewOpmeName("");
    setIsAddingOpme(false);
  };

  const handleSelectOpme = (index: number) => setSelectedOpmeIndex(index);

  const handleRemoveOpme = (index: number) => {
    setOpmeItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedOpmeIndex === index) {
      setSelectedOpmeIndex(opmeItems.length > 1 ? 0 : null);
    } else if (selectedOpmeIndex !== null && selectedOpmeIndex > index) {
      setSelectedOpmeIndex(selectedOpmeIndex - 1);
    }
  };

  const handleDuplicateOpme = (index: number) => {
    setOpmeItems((prev) => [...prev, { ...prev[index], id: undefined }]);
  };

  const updateSelectedOpme = (updates: Partial<OpmeItemForm>) => {
    if (selectedOpmeIndex === null) return;
    setOpmeItems((prev) =>
      prev.map((item, i) =>
        i === selectedOpmeIndex ? { ...item, ...updates } : item,
      ),
    );
  };

  const handleManufacturerChange = (optionIndex: number, value: string) => {
    if (selectedOpmeIndex === null) return;
    const next = [...opmeItems[selectedOpmeIndex].manufacturers];
    next[optionIndex] = value;
    updateSelectedOpme({ manufacturers: next });
  };

  const handleAddManufacturer = () => {
    if (selectedOpmeIndex === null) return;
    updateSelectedOpme({
      manufacturers: [...opmeItems[selectedOpmeIndex].manufacturers, ""],
    });
  };

  const handleAddSupplier = () => {
    if (selectedOpmeIndex === null) return;
    updateSelectedOpme({
      suppliers: [...opmeItems[selectedOpmeIndex].suppliers, { name: "" }],
    });
  };

  const handleQuantityChange = (delta: number) => {
    if (selectedOpmeIndex === null) return;
    updateSelectedOpme({
      quantity: Math.max(1, opmeItems[selectedOpmeIndex].quantity + delta),
    });
  };

  const handleCancel = () => {
    setOpmeItems([]);
    setSelectedOpmeIndex(null);
    setNewOpmeName("");
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (opmeItems.length === 0) {
      setError("Adicione pelo menos um item OPME.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
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
        handleCancel();
        return;
      }

      for (const item of opmeItems) {
        const filledSuppliers = item.suppliers.filter((s) => s.name.trim());
        const supplier_ids = filledSuppliers
          .filter((s) => s.id)
          .map((s) => s.id!);
        const supplier_names = filledSuppliers
          .filter((s) => !s.id)
          .map((s) => s.name.trim());

        const data: CreateOpmeData = {
          surgery_request_id: surgeryRequestId,
          name: item.name,
          brand:
            item.manufacturers.filter((m) => m.trim()).join(", ") || undefined,
          supplier_ids: supplier_ids.length > 0 ? supplier_ids : undefined,
          supplier_names:
            supplier_names.length > 0 ? supplier_names : undefined,
          quantity: item.quantity,
        };

        if (item.id) {
          await opmeService.update({
            id: item.id,
            name: data.name,
            brand: data.brand,
            supplier_ids: data.supplier_ids,
            supplier_names: data.supplier_names,
            quantity: data.quantity,
          });
        } else {
          await opmeService.create(data);
        }
      }

      onSuccess();
      handleCancel();
    } catch (err) {
      console.error("Erro ao salvar OPME:", err);
      setError("Erro ao salvar OPME. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItem =
    selectedOpmeIndex !== null ? opmeItems[selectedOpmeIndex] : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isLoading ? handleCancel : undefined}
      />

      <div className="relative bg-white sm:rounded-2xl shadow-xl flex flex-col w-full h-full sm:w-[800px] sm:h-[650px] sm:max-h-[90vh] sm:overflow-hidden mobile-sheet-offset">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-4 py-3 md:px-6 md:py-4 border-b border-neutral-100">
          <h2 className="ds-modal-title">OPME</h2>
          <button
            onClick={!isLoading ? handleCancel : undefined}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
            disabled={isLoading}
          >
            <IconClose className="w-6 h-6 text-neutral-900" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Painel Esquerdo */}
          <div className="flex flex-col flex-1 min-w-0">
            {error && (
              <div className="mx-4 mt-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs md:text-sm">
                {error}
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-y-auto">
              {opmeItems.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 sm:px-10 py-8 sm:py-12">
                  <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                    <IconEmptyOpme className="w-8 h-8 text-primary-700" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm md:text-base font-semibold text-neutral-900">
                      Nenhum OPME adicionado
                    </p>
                    <p className="text-xs md:text-sm text-neutral-200 leading-relaxed">
                      Adicione os itens de OPME necessários para esta
                      solicitação cirúrgica
                    </p>
                  </div>
                  {isAddingOpme ? (
                    <div className="w-full max-w-xs flex flex-col items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newOpmeName}
                        onChange={(e) => setNewOpmeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddOpme();
                          if (e.key === "Escape") {
                            setIsAddingOpme(false);
                            setNewOpmeName("");
                          }
                        }}
                        onBlur={() => {
                          if (!newOpmeName.trim()) {
                            setIsAddingOpme(false);
                            setNewOpmeName("");
                          }
                        }}
                        placeholder="Nome da OPME..."
                        className="w-full px-3 py-2.5 text-xs md:text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border-2 border-primary-700 rounded-xl focus:outline-none shadow-sm"
                      />
                      <p className="text-xs text-neutral-200">
                        Pressione{" "}
                        <kbd className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 border border-gray-300 rounded">
                          Enter
                        </kbd>{" "}
                        para adicionar
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingOpme(true)}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-semibold text-white bg-primary-700 rounded-xl hover:bg-primary-800 transition-colors shadow-sm"
                    >
                      <IconPlus className="w-4 h-4" />
                      Adicionar OPME
                    </button>
                  )}
                </div>
              )}

              {opmeItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-1 cursor-pointer ${selectedOpmeIndex === index ? "bg-gray-50" : ""}`}
                  onClick={() =>
                    editingNameIndex !== index && handleSelectOpme(index)
                  }
                >
                  <div className="flex items-center gap-3 px-4 py-3 border border-neutral-100 rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.05)] min-h-[64px]">
                    {editingNameIndex === index ? (
                      <input
                        type="text"
                        autoFocus
                        value={item.name}
                        onChange={(e) =>
                          setOpmeItems((prev) =>
                            prev.map((it, i) =>
                              i === index
                                ? { ...it, name: e.target.value }
                                : it,
                            ),
                          )
                        }
                        onBlur={() => setEditingNameIndex(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape")
                            setEditingNameIndex(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 text-xs md:text-sm text-neutral-900 border border-neutral-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-700"
                      />
                    ) : (
                      <span className="flex-1 text-xs md:text-sm text-neutral-900">
                        {item.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateOpme(index);
                        }}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Duplicar"
                      >
                        <IconCopy className="w-5 h-5 text-neutral-900" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNameIndex(index);
                        }}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Renomear"
                      >
                        <IconEdit className="w-5 h-5 text-neutral-900" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOpme(index);
                        }}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Remover"
                      >
                        <IconTrash className="w-5 h-5 text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {opmeItems.length > 0 && (
              <div className="border-t border-neutral-100 px-4 py-3">
                {isAddingOpme ? (
                  <input
                    type="text"
                    autoFocus
                    value={newOpmeName}
                    onChange={(e) => setNewOpmeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddOpme();
                      if (e.key === "Escape") {
                        setIsAddingOpme(false);
                        setNewOpmeName("");
                      }
                    }}
                    onBlur={() => {
                      if (!newOpmeName.trim()) {
                        setIsAddingOpme(false);
                        setNewOpmeName("");
                      }
                    }}
                    placeholder="Nome da OPME..."
                    className="w-full px-3 py-2 text-xs md:text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-700"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingOpme(true)}
                    className="flex items-center gap-2 text-xs md:text-sm font-semibold text-primary-700 hover:text-primary-800 transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    Adicionar OPME
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Painel Direito */}
          {opmeItems.length > 0 && (
            <div className="flex-1 flex flex-col border-t sm:border-t-0 sm:border-l border-neutral-100 min-w-0 sm:max-w-[342px]">
              {selectedItem ? (
                <div className="flex flex-col overflow-y-auto flex-1">
                  {/* Fabricantes */}
                  <Accordion
                    title="Fabricantes"
                    isOpen={manufacturersOpen}
                    onToggle={() => setManufacturersOpen(!manufacturersOpen)}
                  >
                    {selectedItem.manufacturers.map(
                      (manufacturer, optIndex) => (
                        <div key={optIndex} className="space-y-1">
                          <label className="ds-label mb-0">
                            Opção {optIndex + 1}
                          </label>
                          <input
                            type="text"
                            value={manufacturer}
                            onChange={(e) =>
                              handleManufacturerChange(optIndex, e.target.value)
                            }
                            placeholder="Fabricante"
                            className="ds-input"
                          />
                        </div>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={handleAddManufacturer}
                      className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-neutral-900 hover:text-primary-700 transition-colors"
                    >
                      <IconPlus className="w-5 h-5" />
                      Adicionar Opção
                    </button>
                  </Accordion>

                  {/* Fornecedores */}
                  <Accordion
                    title="Fornecedores"
                    isOpen={suppliersOpen}
                    onToggle={() => setSuppliersOpen(!suppliersOpen)}
                  >
                    {selectedItem.suppliers.map((supplier, optIndex) => (
                      <SupplierCombobox
                        key={optIndex}
                        label={`Opção ${optIndex + 1}`}
                        value={supplier}
                        onChange={(val) => handleSupplierChange(optIndex, val)}
                        availableSuppliers={availableSuppliers}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-neutral-900 hover:text-primary-700 transition-colors"
                    >
                      <IconPlus className="w-5 h-5" />
                      Adicionar Opção
                    </button>
                  </Accordion>

                  {/* Quantidade */}
                  <Accordion
                    title="Quantidade"
                    isOpen={quantityOpen}
                    onToggle={() => setQuantityOpen(!quantityOpen)}
                  >
                    <div className="space-y-1">
                      <label className="ds-label mb-0">Quantidade</label>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={selectedItem.quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <IconMinus className="w-5 h-5 text-neutral-900 opacity-50" />
                        </button>
                        <div
                          className="flex items-center justify-center px-3 py-2 border border-neutral-100 rounded-xl bg-white"
                          style={{ width: "52px", height: "40px" }}
                        >
                          <span className="text-xs md:text-sm font-semibold text-neutral-900">
                            {selectedItem.quantity}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white transition-colors"
                        >
                          <IconPlus className="w-5 h-5 text-neutral-900" />
                        </button>
                      </div>
                    </div>
                  </Accordion>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-200 text-xs md:text-sm">
                  Selecione um OPME para configurar
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-3 py-4 bg-white border-t-2 border-neutral-100 safe-area-bottom">
          <button
            onClick={handleCancel}
            className="ds-btn-outline"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || opmeItems.length === 0}
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
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
