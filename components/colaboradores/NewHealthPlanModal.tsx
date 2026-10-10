"use client";

import { useState } from "react";
import { healthPlanService } from "@/services/health-plan.service";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { newHealthPlanSchema } from "@/lib/schemas/healthPlan.schema";
import { unmask } from "@/lib/masks";
import { getApiErrorMessage } from "@/lib/http-error";

interface NewHealthPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewHealthPlanModal({
  isOpen,
  onClose,
  onSuccess,
}: NewHealthPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useZodForm({
    schema: newHealthPlanSchema,
    initialValues: { name: "", phone: "", email: "", cnpj: "" },
  });

  const handleClose = () => {
    if (loading) return;
    form.reset();
    setError("");
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    setError("");
    try {
      await healthPlanService.create({
        name: data.name,
        phone: unmask(data.phone) || undefined,
        email: data.email || undefined,
        cnpj: unmask(data.cnpj) || undefined,
      });
      onSuccess();
      form.reset();
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Erro ao criar convênio. Tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo convênio"
      disableClose={loading}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              aria-required="true"
              placeholder="Nome do convênio"
              {...form.getFieldProps("name")}
            />
            <Input
              label="CNPJ (opcional)"
              mask="cnpj"
              placeholder="12.345.678/0001-90"
              {...form.getFieldProps("cnpj")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        <ModalFooter align="end">
          <button type="submit" disabled={loading} className="ds-btn-primary">
            {loading ? "Adicionando..." : "Adicionar convênio"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
