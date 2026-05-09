"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  patientService,
  CreatePatientPayload,
} from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { GENDER_OPTIONS } from "@/lib/options";
import { DateInput } from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createPatientSchema } from "@/lib/schemas/patient.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  phone: "Telefone",
  email: "E-mail",
  cpf: "CPF",
  birth_date: "Data de nascimento",
  gender: "Gênero",
  health_plan_id: "Convênio",
};

const labelClass = "ds-label mb-0";
const inputClass = "ds-input";

export function NewPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: NewPatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createPatientSchema,
    initialValues: {
      name: "",
      phone: "",
      email: "",
      cpf: "",
      birth_date: "",
      gender: "",
      health_plan_id: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadHealthPlans();
    }
  }, [isOpen]);

  const loadHealthPlans = async () => {
    try {
      const data = await healthPlanService.getAll();
      setHealthPlans(data);
    } catch {
      // silently ignore
    }
  };

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
          phone: unmask(data.phone) || undefined,
          email: data.email,
          cpf: data.cpf ? unmask(data.cpf) : undefined,
          birth_date: data.birth_date || undefined,
          gender: data.gender || undefined,
          health_plan_id: data.health_plan_id || undefined,
        };
        await patientService.create(payload);
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
            : msg || "Erro ao criar paciente. Tente novamente.",
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
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="ds-modal-title">Novo paciente</h2>
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
            {/* Row 1: Nome completo + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                required
                placeholder="Nome completo"
                {...form.getFieldProps("name")}
              />
              <Input
                label="Telefone"
                type="tel"
                mask="phone"
                required
                placeholder="(21) 98765-4321"
                {...form.getFieldProps("phone")}
              />
            </div>

            {/* Row 2: E-mail + CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="E-mail"
                type="email"
                required
                placeholder="paciente@mail.com"
                {...form.getFieldProps("email")}
              />
              <Input
                label="CPF"
                mask="cpf"
                placeholder="123.456.789-00"
                {...form.getFieldProps("cpf")}
              />
            </div>

            {/* Row 3: Data de nascimento + Gênero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Data de nascimento"
                value={form.values.birth_date ?? ""}
                onChange={(v) => form.setField("birth_date", v)}
                className={inputClass}
              />
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Gênero</label>
                <select
                  value={form.values.gender ?? ""}
                  onChange={(e) => form.setField("gender", e.target.value)}
                  className={inputClass}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Convênio (full width) */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Convênio</label>
              <select
                value={form.values.health_plan_id ?? ""}
                onChange={(e) => form.setField("health_plan_id", e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {healthPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
            <button type="submit" disabled={loading} className="ds-btn-primary">
              {loading ? "Adicionando..." : "Adicionar paciente"}
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
