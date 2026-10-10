"use client";

import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import {
  procedureService,
  CreateProcedurePayload,
  Procedure,
} from "@/services/procedure.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createProcedureSchema } from "@/lib/schemas/procedure.schema";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface CreateProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (procedure: Procedure) => void;
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
  const { emTour } = useOnboarding();
  const { showToast } = useToast();

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={loading}
      title="Novo procedimento"
      size="sm"
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-6 pt-5 pb-6">
          <Input
            label="Nome do procedimento"
            placeholder="Ex. Artroscopia de Joelho"
            {...form.getFieldProps("name")}
          />
        </div>

        <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={loading || emTour}
            className="ds-btn-primary"
          >
            {loading ? "Adicionando..." : "Adicionar procedimento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
