"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePickerPopover } from "@/components/ui/DatePickerPopover";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { adminKeys } from "@/lib/query-keys";
import { formatSpDate } from "@/lib/admin-format";
import {
  couponFormSchema,
  endOfDaySp,
  parseBrlToCents,
  type CouponFormInput,
} from "@/lib/schemas/coupon.schema";
import {
  adminService,
  type CreateCouponPayload,
} from "@/services/admin.service";
import { useSubscriptionAction } from "@/components/admin/accounts/subscription/useSubscriptionAction";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL: CouponFormInput = {
  code: "",
  discountType: "percent",
  value: "",
  duration: "once",
  durationInMonths: "",
  maxRedemptions: "",
  redeemBy: "",
  planIds: [],
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildPayload(values: CouponFormInput): CreateCouponPayload {
  const payload: CreateCouponPayload = {
    code: values.code.trim().toUpperCase(),
    duration: values.duration,
  };
  if (values.discountType === "percent") {
    payload.percentOff = Number(values.value);
  } else {
    payload.amountOffCents = parseBrlToCents(values.value) ?? undefined;
  }
  if (values.duration === "repeating") {
    payload.durationInMonths = Number(values.durationInMonths);
  }
  if (values.maxRedemptions.trim() !== "") {
    payload.maxRedemptions = Number(values.maxRedemptions);
  }
  if (values.redeemBy !== "") payload.redeemBy = endOfDaySp(values.redeemBy);
  if (values.planIds.length > 0) payload.planIds = values.planIds;
  return payload;
}

export function NewCouponModal({ isOpen, onClose }: Props) {
  const form = useZodForm({ schema: couponFormSchema, initialValues: INITIAL });
  const { values, errors } = form;

  const plans = useQuery({
    queryKey: adminKeys.plans(),
    queryFn: () => adminService.listPlans(),
    enabled: isOpen,
  });

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () => adminService.createCoupon(buildPayload(values)),
    "Cupom criado.",
    onClose,
  );

  const handleConfirm = () => {
    if (form.validate().success) mutation.mutate();
  };

  const togglePlan = (id: string, checked: boolean) => {
    clearError();
    form.setField(
      "planIds",
      checked
        ? [...values.planIds, id]
        : values.planIds.filter((p) => p !== id),
    );
  };

  const redeemDate = values.redeemBy
    ? new Date(`${values.redeemBy}T12:00:00`)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo cupom"
      size="md"
      disableClose={mutation.isPending}
      footer={
        <ModalFooter align="end">
          <SpinnerButton
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            onClick={handleConfirm}
            isLoading={mutation.isPending}
            loadingText="Criando..."
          >
            Criar cupom
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <Input
          label="Código"
          value={values.code}
          error={errors.code}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => {
            clearError();
            form.setField("code", e.target.value.toUpperCase());
          }}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de desconto"
            value={values.discountType}
            options={[
              { value: "percent", label: "Percentual (%)" },
              { value: "amount", label: "Valor fixo (R$)" },
            ]}
            onChange={(e) => {
              clearError();
              form.setValues({
                discountType: e.target.value as CouponFormInput["discountType"],
                value: "",
              });
            }}
          />
          <Input
            label={
              values.discountType === "percent" ? "Percentual" : "Valor em R$"
            }
            value={values.value}
            error={errors.value}
            inputMode={
              values.discountType === "percent" ? "numeric" : "decimal"
            }
            placeholder={values.discountType === "percent" ? "20" : "100,00"}
            onChange={(e) => {
              clearError();
              form.setField("value", e.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Duração"
            value={values.duration}
            options={[
              { value: "once", label: "Uma vez (primeira cobrança)" },
              { value: "repeating", label: "Por alguns meses" },
              { value: "forever", label: "Para sempre" },
            ]}
            onChange={(e) => {
              clearError();
              form.setValues({
                duration: e.target.value as CouponFormInput["duration"],
                durationInMonths: "",
              });
            }}
          />
          {values.duration === "repeating" && (
            <Input
              label="Meses"
              value={values.durationInMonths}
              error={errors.durationInMonths}
              inputMode="numeric"
              placeholder="3"
              onChange={(e) => {
                clearError();
                form.setField("durationInMonths", e.target.value);
              }}
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Limite de usos (opcional)"
            value={values.maxRedemptions}
            error={errors.maxRedemptions}
            inputMode="numeric"
            onChange={(e) => {
              clearError();
              form.setField("maxRedemptions", e.target.value);
            }}
          />
          <div>
            <span className="ds-label">Validade (opcional)</span>
            <div className="flex items-center gap-2">
              <DatePickerPopover
                value={redeemDate}
                onChange={(d) => {
                  clearError();
                  form.setField("redeemBy", toIsoDate(d));
                }}
                trigger={
                  <button
                    type="button"
                    className="ds-input flex items-center gap-2 text-left"
                    aria-label="Escolher validade"
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {values.redeemBy
                      ? formatSpDate(endOfDaySp(values.redeemBy))
                      : "Sem validade"}
                  </button>
                }
              />
              {values.redeemBy && (
                <button
                  type="button"
                  className="ds-btn-inline"
                  aria-label="Remover validade"
                  onClick={() => form.setField("redeemBy", "")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            {errors.redeemBy && (
              <p className="mt-1 text-sm text-red-600">{errors.redeemBy}</p>
            )}
          </div>
        </div>
        <fieldset>
          <legend className="ds-label">Restringir a planos (opcional)</legend>
          <p className="mb-2 text-xs text-gray-500">
            Sem seleção, o cupom vale para todos os planos. Planos do mesmo
            produto na Stripe (mensal e anual) são restringidos juntos.
          </p>
          {plans.isLoading ? (
            <p className="text-sm text-gray-500">Carregando planos...</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-gray-200 p-2">
              {(plans.data ?? []).map((plan) => (
                <li key={plan.id}>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <Checkbox
                      aria-label={plan.name}
                      checked={values.planIds.includes(plan.id)}
                      onCheckedChange={(c) => togglePlan(plan.id, c)}
                    />
                    <span aria-hidden="true">{plan.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {errors.planIds && (
            <p className="mt-1 text-sm text-red-600">{errors.planIds}</p>
          )}
        </fieldset>
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
