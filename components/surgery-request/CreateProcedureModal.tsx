"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  procedureService,
  CreateProcedurePayload,
} from "@/services/procedure.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createProcedureSchema } from "@/lib/schemas/procedure.schema";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

interface CreateProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (procedure: any) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome do procedimento",
};

export function CreateProcedureModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProcedureModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createProcedureSchema,
    initialValues: { name: "" },
  });

  const handleClose = () => {
    if (loading) return;
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit(
    async (data) => {
      setLoading(true);
      try {
        const payload: CreateProcedurePayload = { name: data.name.trim() };
        const newProcedure = await procedureService.create(payload);
        onSuccess(newProcedure);
        form.reset();
        onClose();
      } catch (err: unknown) {
        showToast(
          getApiErrorMessage(
            err,
            "Erro ao criar procedimento. Tente novamente.",
          ),
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-gray-200">
          <h2 className="ds-modal-title">Novo procedimento</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} noValidate>
          <div className="px-6 pt-5 pb-6">
            <Input
              label="Nome do procedimento"
              placeholder="Ex. Artroscopia de Joelho"
              {...form.getFieldProps("name")}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={loading} className="ds-btn-primary">
              {loading ? "Adicionando..." : "Adicionar procedimento"}
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
