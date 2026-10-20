"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Package } from "lucide-react";
import {
  opmeService,
  OpmeItem,
  CreateOpmeData,
  OpmeSupplier,
} from "@/services/opme.service";
import { logger } from "@/lib/logger";
import { getApiErrorMessage } from "@/lib/http-error";
import type { Manufacturer } from "@/services/manufacturer.service";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useManufacturers } from "@/hooks/useManufacturers";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { AddOpmeRow, EmptyState, OpmeItemCard } from "./OpmeItemCard";
import {
  MIN_OPTIONS,
  OpmeItemForm,
  SupplierOption,
  emptyManufacturerSlots,
  emptySupplierSlots,
  formatCreatedNames,
  normalizeOptionName,
  padManufacturers,
  padSuppliers,
} from "./opme-form";

interface OpmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
  editingOpme?: OpmeItem | null;
  onLocalSave?: (
    items: {
      name: string;
      manufacturers: string[];
      suppliers: string[];
      quantity: number;
    }[],
  ) => void;
  initialItems?: {
    name: string;
    manufacturers: string[];
    suppliers: string[];
    quantity: number;
  }[];
}

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
  const [saveError, setSaveError] = useState<string | null>(null);

  const { showToast } = useToast();

  const suppliersQuery = useSuppliers({ enabled: isOpen });
  const manufacturersQuery = useManufacturers({ enabled: isOpen });
  const availableSuppliers = useMemo<OpmeSupplier[]>(
    () =>
      (suppliersQuery.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [suppliersQuery.data],
  );
  const availableManufacturers: Manufacturer[] = useMemo(
    () => manufacturersQuery.data ?? [],
    [manufacturersQuery.data],
  );
  const catalogError = suppliersQuery.error ?? manufacturersQuery.error;

  useEffect(() => {
    if (!isOpen || !catalogError) return;
    showToast(
      getApiErrorMessage(
        catalogError,
        "Não foi possível carregar fornecedores e fabricantes.",
      ),
      "error",
    );
  }, [isOpen, catalogError, showToast]);
  const handleClose = useCallback(() => {
    if (isLoading) return;
    setOpmeItems([]);
    setExpandedIndex(null);
    setEditingNameIndex(null);
    setNewOpmeName("");
    setSaveError(null);
    onClose();
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingOpme) {
      const existingSuppliers: SupplierOption[] =
        editingOpme.suppliers?.map((s) => ({ id: s.id, name: s.name })) ?? [];

      const existingManufacturers =
        editingOpme.manufacturers?.map((m) => m.name).filter(Boolean) ?? [];

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

  const modalTitle = (
    <span className="flex items-center gap-3">
      <span className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 text-primary-700 shrink-0">
        <Package className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block">Materiais OPME</span>
        <span className="hidden sm:block ds-caption mt-0.5 font-normal">
          Configure os materiais necessários para esta cirurgia
        </span>
      </span>
    </span>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        disableClose={isLoading}
        title={modalTitle}
        size="md"
        footer={
          <div className="ds-modal-footer shrink-0">
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
        }
      >
        <div className="px-4 py-4 md:px-6 md:py-5">
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
      </Modal>
    </>
  );
}
