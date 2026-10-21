"use client";

import { useEffect, useMemo } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useFinanceProfessionals } from "@/hooks/useFinanceProfessionals";
import { financeService } from "@/services/finance.service";
import { APPOINTMENT_TYPE_LABELS } from "@/services/appointment.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  applyBRLMask,
  brlMaskToDecimal,
  decimalToBRLMask,
} from "@/lib/currency";
import {
  SERVICE_PRICE_APPOINTMENT_TYPES,
  servicePriceSchema,
  type ServicePriceInput,
  type ServicePriceValues,
} from "@/lib/schemas/service-price";
import type { ServicePriceDto } from "@/types/finance.types";

interface ServicePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicePrice?: ServicePriceDto | null;
}

const VAZIO: ServicePriceInput = {
  doctorId: "",
  appointmentType: "",
  description: "",
  amount: "",
  active: true,
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  ...SERVICE_PRICE_APPOINTMENT_TYPES.map((type) => ({
    value: type,
    label: APPOINTMENT_TYPE_LABELS[type],
  })),
];

function valoresDe(servicePrice?: ServicePriceDto | null): ServicePriceInput {
  if (!servicePrice) return VAZIO;
  return {
    doctorId: servicePrice.doctorId ?? "",
    appointmentType: servicePrice.appointmentType ?? "",
    description: servicePrice.description,
    amount: decimalToBRLMask(servicePrice.amount),
    active: servicePrice.active,
  };
}

export function ServicePriceModal({
  isOpen,
  onClose,
  servicePrice,
}: ServicePriceModalProps) {
  const editando = !!servicePrice;
  const { showSuccess, showError } = useToast();
  const { data: doctors = [] } = useFinanceProfessionals();
  const form = useZodForm({
    schema: servicePriceSchema,
    initialValues: valoresDe(servicePrice),
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset(valoresDe(servicePrice));
  }, [isOpen, servicePrice, reset]);

  const doctorOptions = useMemo(() => {
    const opcoes = [
      { value: "", label: "Todos os profissionais" },
      ...doctors.map((d) => ({ value: d.id, label: d.name })),
    ];
    if (
      servicePrice?.doctor &&
      !opcoes.some((o) => o.value === servicePrice.doctor!.id)
    ) {
      opcoes.push({
        value: servicePrice.doctor.id,
        label: servicePrice.doctor.name,
      });
    }
    return opcoes;
  }, [doctors, servicePrice]);

  const salvar = useFinanceMutation(
    (data: ServicePriceValues) => {
      const payload = {
        doctorId: data.doctorId || null,
        appointmentType: data.appointmentType || null,
        description: data.description,
        amount: brlMaskToDecimal(data.amount),
        active: data.active,
      };
      return servicePrice
        ? financeService.updateServicePrice(servicePrice.id, payload)
        : financeService.createServicePrice(payload);
    },
    {
      invalidate: [financeKeys.servicePrices()],
      onSuccess: () => {
        showSuccess(editando ? "Preço atualizado." : "Preço cadastrado.");
        onClose();
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível salvar o preço."),
        ),
    },
  );

  const handleClose = () => {
    if (salvar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await salvar.mutateAsync(data).catch(() => undefined);
  });

  const doctorProps = form.getFieldProps("doctorId");
  const typeProps = form.getFieldProps("appointmentType");
  const amountProps = form.getFieldProps("amount");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editando ? "Editar preço" : "Novo preço"}
      disableClose={salvar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <Select
            label="Profissional"
            options={doctorOptions}
            name={doctorProps.name}
            value={doctorProps.value}
            onChange={doctorProps.onChange}
            error={doctorProps.error}
          />
          <Select
            label="Tipo de consulta"
            options={TYPE_OPTIONS}
            name={typeProps.name}
            value={typeProps.value}
            onChange={typeProps.onChange}
            error={typeProps.error}
          />
          <Input
            label="Descrição"
            placeholder="Ex.: Consulta ortopédica"
            required
            {...form.getFieldProps("description")}
          />
          <Input
            label="Valor"
            placeholder="R$ 0,00"
            inputMode="numeric"
            required
            name={amountProps.name}
            value={amountProps.value}
            error={amountProps.error}
            onChange={(e) => form.setField("amount", applyBRLMask(e.target.value))}
          />
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.values.active}
              onChange={(e) => form.setField("active", e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            Ativo
          </label>
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={salvar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvar.isPending}
            className="ds-btn-primary"
          >
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
