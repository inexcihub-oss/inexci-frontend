"use client";

import { Modal } from "@/components/ui/Modal";
import { useEffect, useState } from "react";
import {
  healthPlanService,
  CreateHealthPlanPayload,
  HealthPlan,
} from "@/services/health-plan.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createHealthPlanSchema } from "@/lib/schemas/healthPlan.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface CreateHealthPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (healthPlan: HealthPlan) => void;
  initialName?: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Convênio",
  phone: "Telefone",
  email: "E-mail",
};

export function CreateHealthPlanModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
}: CreateHealthPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const { emTour } = useOnboarding();
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const form = useZodForm({
    schema: createHealthPlanSchema,
    initialValues: { name: "", phone: "", email: "" },
  });

  useEffect(() => {
    if (isOpen) {
      form.setField("name", initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialName]);

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
        const phone = unmask(data.phone);
        const email = data.email?.trim();

        const payload: CreateHealthPlanPayload = {
          name: data.name.trim(),
          phone: phone || undefined,
          email: email || undefined,
        };
        const newHealthPlan = await healthPlanService.create(payload);
        onSuccess(newHealthPlan);
        form.reset();
        onClose();
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, "Erro ao criar convênio. Tente novamente."),
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
      title="Novo convênio"
      size="sm"
    >
      <form
        onSubmit={(e) => {
          e.stopPropagation();
          void onSubmit(e);
        }}
        noValidate
      >
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <Input
            label="Convênio"
            placeholder="Nome do convênio"
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
            placeholder="convenio@mail.com"
            {...form.getFieldProps("email")}
          />

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
            {loading ? "Adicionando..." : "Adicionar convênio"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
