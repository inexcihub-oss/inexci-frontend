"use client";

import React, { useState, useEffect } from "react";
import { opmeService, OpmeItem, CreateOpmeData } from "@/services/opme.service";

interface OpmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
  editingOpme?: OpmeItem | null;
  /** When provided, saves locally instead of calling the API */
  onLocalSave?: (
    items: {
      name: string;
      manufacturers: string[];
      suppliers: string[];
      quantity: number;
    }[],
  ) => void;
  /** Pre-populate items when opening in local mode */
  initialItems?: {
    name: string;
    manufacturers: string[];
    suppliers: string[];
    quantity: number;
  }[];
}

interface OpmeItemForm {
  id?: string;
  name: string;
  manufacturers: string[];
  suppliers: string[];
  quantity: number;
}

// Ícones SVG inline conforme Figma
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

// Componente de Accordion colapsável
interface AccordionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, isOpen, onToggle, children }: AccordionProps) {
  return (
    <div className="border-b border-[#DCDFE3] w-full">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-4 py-2 ${isOpen ? "border-b border-[#DCDFE3]" : ""}`}
      >
        <span className="text-sm md:text-base font-semibold text-[#000000]">
          {title}
        </span>
        <div
          className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <IconArrowDown className="w-4 h-4 text-[#000000]" />
        </div>
      </button>
      {isOpen && <div className="bg-[#F2F2F2] p-4 space-y-6">{children}</div>}
    </div>
  );
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
  const [selectedOpmeIndex, setSelectedOpmeIndex] = useState<number | null>(
    null,
  );
  const [newOpmeName, setNewOpmeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [isAddingOpme, setIsAddingOpme] = useState(false);

  // Estados dos accordions
  const [manufacturersOpen, setManufacturersOpen] = useState(true);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [quantityOpen, setQuantityOpen] = useState(true);

  const MIN_OPTIONS = 3;

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      if (editingOpme) {
        const parseList = (value?: string | null) => {
          const items = value
            ? value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
          // garantir no mínimo MIN_OPTIONS slots
          while (items.length < MIN_OPTIONS) items.push("");
          return items;
        };
        setOpmeItems([
          {
            id: editingOpme.id,
            name: editingOpme.name,
            manufacturers: parseList(editingOpme.brand),
            suppliers: parseList(editingOpme.distributor),
            quantity: editingOpme.quantity,
          },
        ]);
        setSelectedOpmeIndex(0);
      } else if (initialItems && initialItems.length > 0) {
        setOpmeItems(
          initialItems.map((item) => ({
            name: item.name,
            manufacturers:
              item.manufacturers.length >= 3
                ? [...item.manufacturers]
                : [
                    ...item.manufacturers,
                    ...Array(3 - item.manufacturers.length).fill(""),
                  ],
            suppliers:
              item.suppliers.length >= 3
                ? [...item.suppliers]
                : [
                    ...item.suppliers,
                    ...Array(3 - item.suppliers.length).fill(""),
                  ],
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
  }, [isOpen, editingOpme]);

  if (!isOpen) return null;

  const handleAddOpme = () => {
    if (!newOpmeName.trim()) return;

    const newItem: OpmeItemForm = {
      name: newOpmeName.trim(),
      manufacturers: ["", "", ""],
      suppliers: ["", "", ""],
      quantity: 1,
    };

    setOpmeItems((prev) => [...prev, newItem]);
    setSelectedOpmeIndex(opmeItems.length);
    setNewOpmeName("");
    setIsAddingOpme(false);
  };

  const handleSelectOpme = (index: number) => {
    setSelectedOpmeIndex(index);
  };

  const handleRemoveOpme = (index: number) => {
    setOpmeItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedOpmeIndex === index) {
      setSelectedOpmeIndex(opmeItems.length > 1 ? 0 : null);
    } else if (selectedOpmeIndex !== null && selectedOpmeIndex > index) {
      setSelectedOpmeIndex(selectedOpmeIndex - 1);
    }
  };

  const handleDuplicateOpme = (index: number) => {
    const itemToDuplicate = opmeItems[index];
    const duplicatedItem = { ...itemToDuplicate, id: undefined };
    setOpmeItems((prev) => [...prev, duplicatedItem]);
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

    const currentManufacturers = [
      ...opmeItems[selectedOpmeIndex].manufacturers,
    ];
    currentManufacturers[optionIndex] = value;
    updateSelectedOpme({ manufacturers: currentManufacturers });
  };

  const handleAddManufacturer = () => {
    if (selectedOpmeIndex === null) return;

    const currentManufacturers = [
      ...opmeItems[selectedOpmeIndex].manufacturers,
    ];
    currentManufacturers.push("");
    updateSelectedOpme({ manufacturers: currentManufacturers });
  };

  const handleSupplierChange = (optionIndex: number, value: string) => {
    if (selectedOpmeIndex === null) return;

    const currentSuppliers = [...opmeItems[selectedOpmeIndex].suppliers];
    currentSuppliers[optionIndex] = value;
    updateSelectedOpme({ suppliers: currentSuppliers });
  };

  const handleAddSupplier = () => {
    if (selectedOpmeIndex === null) return;

    const currentSuppliers = [...opmeItems[selectedOpmeIndex].suppliers];
    currentSuppliers.push("");
    updateSelectedOpme({ suppliers: currentSuppliers });
  };

  const handleQuantityChange = (delta: number) => {
    if (selectedOpmeIndex === null) return;

    const currentQuantity = opmeItems[selectedOpmeIndex].quantity;
    updateSelectedOpme({ quantity: Math.max(1, currentQuantity + delta) });
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
        // Modo local: retorna os dados sem chamar a API
        onLocalSave(
          opmeItems.map((item) => ({
            name: item.name,
            manufacturers: item.manufacturers.filter((m) => m.trim()),
            suppliers: item.suppliers.filter((s) => s.trim()),
            quantity: item.quantity,
          })),
        );
        onSuccess();
        handleCancel();
        return;
      }

      // Salvar cada item OPME via API
      for (const item of opmeItems) {
        const data: CreateOpmeData = {
          surgery_request_id: surgeryRequestId,
          name: item.name,
          brand:
            item.manufacturers.filter((m) => m.trim()).join(", ") || undefined,
          distributor:
            item.suppliers.filter((s) => s.trim()).join(", ") || undefined,
          quantity: item.quantity,
        };

        if (item.id) {
          // Atualizar item existente
          await opmeService.update({
            id: item.id,
            name: data.name,
            brand: data.brand,
            distributor: data.distributor,
            quantity: data.quantity,
          });
        } else {
          // Criar novo item
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isLoading ? handleCancel : undefined}
      />

      {/* Modal - fullscreen mobile, centered desktop */}
      <div className="relative bg-white sm:rounded-2xl shadow-xl flex flex-col w-full h-full sm:w-[800px] sm:h-[650px] sm:max-h-[90vh] sm:overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-4 py-3 md:px-6 md:py-4 border-b border-[#DCDFE3]">
          <h2 className="ds-modal-title">OPME</h2>
          <button
            onClick={!isLoading ? handleCancel : undefined}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
            disabled={isLoading}
          >
            <IconClose className="w-6 h-6 text-[#111111]" />
          </button>
        </div>

        {/* Content Area - Split View */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Painel Esquerdo - Lista de OPME */}
          <div className="flex flex-col flex-1 min-w-0">
            {error && (
              <div className="mx-4 mt-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs md:text-sm">
                {error}
              </div>
            )}

            {/* Lista de OPMEs adicionados */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              {opmeItems.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 sm:px-10 py-8 sm:py-12">
                  <div className="w-16 h-16 rounded-full bg-[#EAF4F4] flex items-center justify-center">
                    <IconEmptyOpme className="w-8 h-8 text-[#147471]" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm md:text-base font-semibold text-[#111111]">
                      Nenhum OPME adicionado
                    </p>
                    <p className="text-xs md:text-sm text-[#758195] leading-relaxed">
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
                        className="w-full px-3 py-2.5 text-xs md:text-sm text-[#111111] placeholder:text-[#758195] bg-white border-2 border-[#147471] rounded-xl focus:outline-none shadow-sm"
                      />
                      <p className="text-xs text-[#758195]">
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
                      className="flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-semibold text-white bg-[#147471] rounded-xl hover:bg-[#0f5c5a] transition-colors shadow-sm"
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
                  <div className="flex items-center gap-3 px-4 py-3 border border-[#DCDFE3] rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.05)] min-h-[64px]">
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
                          if (e.key === "Enter" || e.key === "Escape") {
                            setEditingNameIndex(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 text-xs md:text-sm text-[#111111] border border-[#DCDFE3] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#147471]"
                      />
                    ) : (
                      <span className="flex-1 text-xs md:text-sm text-[#111111]">
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
                        <IconCopy className="w-5 h-5 text-[#111111]" />
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
                        <IconEdit className="w-5 h-5 text-[#111111]" />
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
                        <IconTrash className="w-5 h-5 text-[#E34935]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer do painel esquerdo - Adicionar OPME (só aparece quando já há itens) */}
            {opmeItems.length > 0 && (
              <div className="border-t border-[#DCDFE3] px-4 py-3">
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
                    className="w-full px-3 py-2 text-xs md:text-sm text-[#111111] placeholder:text-[#758195] bg-white border border-[#DCDFE3] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#147471]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingOpme(true)}
                    className="flex items-center gap-2 text-xs md:text-sm font-semibold text-[#147471] hover:text-[#0f5c5a] transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    Adicionar OPME
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Painel Direito - Configurações do OPME selecionado */}
          {opmeItems.length > 0 && (
            <div className="flex-1 flex flex-col border-t sm:border-t-0 sm:border-l border-[#DCDFE3] min-w-0 sm:max-w-[342px]">
              {selectedItem ? (
                <div className="flex flex-col overflow-y-auto flex-1">
                  {/* Accordion: Fabricantes */}
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
                      className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-[#111111] hover:text-[#147471] transition-colors"
                    >
                      <IconPlus className="w-5 h-5" />
                      Adicionar Opção
                    </button>
                  </Accordion>

                  {/* Accordion: Fornecedores */}
                  <Accordion
                    title="Fornecedores"
                    isOpen={suppliersOpen}
                    onToggle={() => setSuppliersOpen(!suppliersOpen)}
                  >
                    {selectedItem.suppliers.map((supplier, optIndex) => (
                      <div key={optIndex} className="space-y-1">
                        <label className="ds-label mb-0">
                          Opção {optIndex + 1}
                        </label>
                        <input
                          type="text"
                          value={supplier}
                          onChange={(e) =>
                            handleSupplierChange(optIndex, e.target.value)
                          }
                          placeholder="Fornecedor"
                          className="ds-input"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-[#111111] hover:text-[#147471] transition-colors"
                    >
                      <IconPlus className="w-5 h-5" />
                      Adicionar Opção
                    </button>
                  </Accordion>

                  {/* Accordion: Quantidade */}
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
                          <IconMinus className="w-5 h-5 text-[#111111] opacity-50" />
                        </button>
                        <div
                          className="flex items-center justify-center px-3 py-2 border border-[#DCDFE3] rounded-xl bg-white"
                          style={{ width: "52px", height: "40px" }}
                        >
                          <span className="text-xs md:text-sm font-semibold text-[#111111]">
                            {selectedItem.quantity}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white transition-colors"
                        >
                          <IconPlus className="w-5 h-5 text-[#111111]" />
                        </button>
                      </div>
                    </div>
                  </Accordion>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#758195] text-xs md:text-sm">
                  Selecione um OPME para configurar
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-3 py-4 bg-white border-t-2 border-[#DCDFE3] safe-area-bottom">
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
