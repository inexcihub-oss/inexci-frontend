"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  hospitalService,
  CreateHospitalPayload,
  Hospital,
} from "@/services/hospital.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createHospitalSchema } from "@/lib/schemas/hospital.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

interface CreateHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hospital: Hospital) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Hospital",
  phone: "Telefone",
  email: "E-mail",
};

export function CreateHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateHospitalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createHospitalSchema,
    initialValues: {
      name: "",
      phone: "",
      email: "",
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
        const payload: CreateHospitalPayload = {
          name: data.name.trim(),
          phone: unmask(data.phone) || undefined,
          email: data.email || undefined,
        };
        const newHospital = await hospitalService.create(payload);
        onSuccess(newHospital);
        form.reset();
        onClose();
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, "Erro ao criar hospital. Tente novamente."),
        );
      } finally {
        setLoading(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-[600px] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="ds-modal-title">Novo hospital</h2>
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
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
            <Input
              label="Hospital"
              placeholder="Nome do hospital"
              {...form.getFieldProps("name")}
            />

            <Input
              label="Telefone (opcional)"
              type="tel"
              mask="phone"
              placeholder="(21) 98765-4321"
              {...form.getFieldProps("phone")}
            />

            <Input
              label="E-mail (opcional)"
              type="email"
              placeholder="hospital@mail.com"
              {...form.getFieldProps("email")}
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
            <button type="submit" disabled={loading} className="ds-btn-primary">
              {loading ? "Adicionando..." : "Adicionar hospital"}
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
