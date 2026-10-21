"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { ModalFooter } from "@/components/shared/ModalFooter";
import {
  ITEM_VAZIO,
  ReceivableItemFields,
  itemPayload,
} from "@/components/finance/receivables/ReceivableItemFields";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { patientService } from "@/services/patient.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { formatMoney, centsToDecimal } from "@/lib/currency";
import {
  centavosDaMascara,
  newReceivableSchema,
  type NewReceivableInput,
  type ReceivableItemInput,
} from "@/lib/schemas/finance";
import type {
  CreateReceivablePayload,
  ReceivableDetailDto,
} from "@/types/finance.types";

interface NewReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (receivable: ReceivableDetailDto) => void;
  defaultPatient?: { id: string; name: string } | null;
}

function vazio(patientId = ""): NewReceivableInput {
  return { patientId, items: [{ ...ITEM_VAZIO }] };
}

export function NewReceivableModal({
  isOpen,
  onClose,
  onCreated,
  defaultPatient,
}: NewReceivableModalProps) {
  const { showSuccess, showError } = useToast();
  const [patientLabel, setPatientLabel] = useState(defaultPatient?.name ?? "");
  const form = useZodForm({
    schema: newReceivableSchema,
    initialValues: vazio(defaultPatient?.id),
  });
  const { reset } = form;
  const defaultId = defaultPatient?.id;
  const defaultName = defaultPatient?.name;

  useEffect(() => {
    if (!isOpen) return;
    reset(vazio(defaultId));
    setPatientLabel(defaultName ?? "");
  }, [isOpen, defaultId, defaultName, reset]);

  const searchPatients = useCallback(async (term: string) => {
    const { records } = await patientService.list({ search: term, take: 20 });
    return records.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  const criar = useFinanceMutation(
    (payload: CreateReceivablePayload) =>
      financeService.createReceivable(payload),
    {
      onSuccess: (criada) => {
        showSuccess("Cobrança criada.");
        onCreated?.(criada);
        onClose();
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível criar a cobrança."),
        ),
    },
  );

  const itens = form.values.items;
  const totalCents = itens.reduce(
    (t, i) => t + centavosDaMascara(i.amount),
    0,
  );

  const atualizarItem = (index: number, patch: Partial<ReceivableItemInput>) =>
    form.setField(
      "items",
      itens.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const handleClose = () => {
    if (criar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await criar
      .mutateAsync({
        patientId: data.patientId,
        items: data.items.map(itemPayload),
      })
      .catch(() => undefined);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova cobrança"
      disableClose={criar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="ds-label mb-0">
              Paciente<span className="text-red-500 ml-0.5">*</span>
            </span>
            <SelectSearch
              value={form.values.patientId ?? ""}
              initialLabel={patientLabel}
              onChange={(value, label) => {
                form.setField("patientId", value);
                setPatientLabel(label ?? "");
              }}
              onSearch={searchPatients}
              placeholder="Buscar paciente pelo nome..."
              ariaLabel="Paciente"
              error={form.errors.patientId}
              disabled={!!defaultPatient}
            />
          </div>

          <ul className="flex flex-col gap-3" aria-label="Itens da cobrança">
            {itens.map((item, index) => (
              <li
                key={index}
                className="rounded-xl border border-neutral-200 p-3 flex flex-col gap-2"
              >
                <ReceivableItemFields
                  value={item}
                  onChange={(patch) => atualizarItem(index, patch)}
                  errors={{
                    description: form.errors[`items.${index}.description`],
                    executedById: form.errors[`items.${index}.executedById`],
                    amount: form.errors[`items.${index}.amount`],
                  }}
                />
                {itens.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      form.setField(
                        "items",
                        itens.filter((_, i) => i !== index),
                      )
                    }
                    className="self-end inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline min-h-[36px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover item
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => form.setField("items", [...itens, { ...ITEM_VAZIO }])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              Adicionar item
            </button>
            <span className="text-sm font-semibold text-neutral-800">
              Total {formatMoney(centsToDecimal(totalCents))}
            </span>
          </div>
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={criar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={criar.isPending}
            className="ds-btn-primary"
          >
            {criar.isPending ? "Salvando..." : "Criar cobrança"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
