"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  patientService,
  CreatePatientPayload,
} from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  birth_date: "",
  gender: "",
  health_plan_id: "",
};

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function NewPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: NewPatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);

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
    setFormData(EMPTY_FORM);
    setEmailError("");
    setError("");
    onClose();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: applyPhoneMask(e.target.value) });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: applyCpfMask(e.target.value) });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value });
    if (emailError) setEmailError("");
  };

  const handleEmailBlur = () => {
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: CreatePatientPayload = {
        name: formData.name.trim(),
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, "") : undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
        health_plan_id: formData.health_plan_id || undefined,
      };

      const newPatient = await patientService.create(payload);
      void newPatient;
      onSuccess();
      setFormData(EMPTY_FORM);
      setEmailError("");
      setError("");
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
  };

  if (!isOpen) return null;

  const inputClass = "ds-input";

  const labelClass = "ds-label mb-0";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal — proporções similares ao modal OPME/TUSS */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh]">
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
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5 overflow-y-auto">
            {/* Row 1: Nome completo + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <span className="text-red-500 mr-0.5">*</span>Nome completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome completo"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <span className="text-red-500 mr-0.5">*</span>Telefone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(21) 98765-4321"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: E-mail + CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <span className="text-red-500 mr-0.5">*</span>E-mail
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="paciente@mail.com"
                  className={`${inputClass} ${emailError ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {emailError && (
                  <span className="text-xs text-red-500">{emailError}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>CPF</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={handleCpfChange}
                  placeholder="123.456.789-00"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 3: Data de nascimento + Gênero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Data de nascimento</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) =>
                    setFormData({ ...formData, birth_date: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Gênero</label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            {/* Row 4: Convênio (full width) */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Convênio</label>
              <select
                value={formData.health_plan_id}
                onChange={(e) =>
                  setFormData({ ...formData, health_plan_id: e.target.value })
                }
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
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="ds-btn-primary"
            >
              {loading ? "Adicionando..." : "Adicionar paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
