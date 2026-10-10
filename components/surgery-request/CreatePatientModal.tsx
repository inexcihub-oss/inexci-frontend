"use client";

import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import {
  patientService,
  CreatePatientPayload,
  Patient,
} from "@/services/patient.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createPatientQuickSchema } from "@/lib/schemas/patient.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  cpf: "CPF",
  phone: "Telefone",
  email: "E-mail",
};

export function CreatePatientModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePatientModalProps) {
  const [loading, setLoading] = useState(false);
  const { emTour } = useOnboarding();
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const form = useZodForm({
    schema: createPatientQuickSchema,
    initialValues: { name: "", cpf: "", phone: "", email: "" },
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
        const payload: CreatePatientPayload = {
          name: data.name.trim(),
          cpf: unmask(data.cpf),
          email: data.email || undefined,
          phone: data.phone ? unmask(data.phone) : undefined,
        };
        const newPatient = await patientService.create(payload);
        onSuccess(newPatient);
        form.reset();
        onClose();
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, "Erro ao criar paciente. Tente novamente."),
        );
      } finally {
        setLoading(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={loading}
      title="Novo paciente"
      size="sm"
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <Input
            label="Nome completo"
            placeholder="Nome do paciente"
            {...form.getFieldProps("name")}
          />

          <Input
            label="CPF"
            mask="cpf"
            placeholder="123.456.789-00"
            {...form.getFieldProps("cpf")}
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
            placeholder="paciente@mail.com"
            {...form.getFieldProps("email")}
          />

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Obs.: Não será possível notificar o paciente sem os dados de
            telefone e e-mail.
          </p>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
        <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || emTour}
            className="ds-btn-primary"
          >
            {loading ? "Adicionando..." : "Adicionar paciente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
