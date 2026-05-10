"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  supplierService,
  CreateSupplierPayload,
} from "@/services/supplier.service";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createSupplierSchema } from "@/lib/schemas/supplier.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

interface NewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  cnpj: "CNPJ",
  phone: "Telefone",
  email: "E-mail",
  contactName: "Nome do contato",
  contactPhone: "Telefone do contato",
  contactEmail: "E-mail do contato",
};

export function NewSupplierModal({
  isOpen,
  onClose,
  onSuccess,
}: NewSupplierModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createSupplierSchema,
    initialValues: {
      name: "",
      cnpj: "",
      phone: "",
      email: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const handleClose = () => {
    if (loading) return;
    form.reset();
    setError("");
    onClose();
  };

  const onSubmit = form.handleSubmit(
    async (data) => {
      setLoading(true);
      setError("");
      try {
        const payload: CreateSupplierPayload = {
          name: data.name.trim(),
          cnpj: data.cnpj ? unmask(data.cnpj) : undefined,
          phone: unmask(data.phone) || undefined,
          email: data.email || undefined,
          contactName: data.contactName || undefined,
          contactPhone: unmask(data.contactPhone) || undefined,
          contactEmail: data.contactEmail || undefined,
        };
        await supplierService.create(payload);
        onSuccess();
        form.reset();
        onClose();
      } catch (err) {
        const apiError = err as {
          response?: { data?: { message?: string | string[] } };
        };
        const msg = apiError?.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Erro ao criar fornecedor. Tente novamente.",
        );
      } finally {
        setLoading(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh] mobile-sheet-offset">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 flex-shrink-0">
          <h2 className="ds-modal-title">Novo fornecedor</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="h-px bg-gray-200 flex-shrink-0" />

        {/* Body */}
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5 overflow-y-auto">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome"
                required
                placeholder="Nome do fornecedor"
                {...form.getFieldProps("name")}
              />
              <Input
                label="CNPJ"
                mask="cnpj"
                placeholder="12.345.678/0001-90"
                {...form.getFieldProps("cnpj")}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone"
                type="tel"
                mask="phone"
                placeholder="(21) 98765-4321"
                {...form.getFieldProps("phone")}
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="fornecedor@mail.com"
                {...form.getFieldProps("email")}
              />
            </div>

            {/* Separator */}
            <div className="pt-1">
              <p className="text-sm font-bold text-gray-700">
                Contato comercial
              </p>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome do contato"
                placeholder="Nome do contato"
                {...form.getFieldProps("contactName")}
              />
              <Input
                label="Telefone do contato"
                type="tel"
                mask="phone"
                placeholder="(21) 98765-4321"
                {...form.getFieldProps("contactPhone")}
              />
            </div>

            {/* Row 4 */}
            <Input
              label="E-mail do contato"
              type="email"
              placeholder="contato@fornecedor.com"
              {...form.getFieldProps("contactEmail")}
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="ds-modal-footer">
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              {loading ? "Adicionando..." : "Adicionar fornecedor"}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
