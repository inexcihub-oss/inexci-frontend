"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  healthPlanService,
  CreateHealthPlanPayload,
  HealthPlan,
} from "@/services/health-plan.service";

interface CreateHealthPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (healthPlan: HealthPlan) => void;
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type FormData = { name: string; phone: string; email: string };
const EMPTY_FORM: FormData = { name: "", phone: "", email: "" };

export function CreateHealthPlanModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateHealthPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, phone: applyPhoneMask(e.target.value) }));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    if (emailError) setEmailError("");
  };

  const handleEmailBlur = () => {
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
    } else {
      setEmailError("");
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFormData(EMPTY_FORM);
    setEmailError("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: CreateHealthPlanPayload = {
        name: formData.name.trim(),
        phone: formData.phone,
        email: formData.email,
      };
      const newHealthPlan = await healthPlanService.create(payload);
      onSuccess(newHealthPlan);
      setFormData(EMPTY_FORM);
      setEmailError("");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Erro ao criar convênio. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "ds-input";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-[480px] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <h2 className="ds-modal-title">Novo convênio</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="h-px bg-gray-200" />

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
            {/* Convênio */}
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Convênio</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome do convênio"
                className={inputClass}
              />
            </div>

            {/* Telefone */}
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Telefone</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(21) 98765-4321"
                className={inputClass}
              />
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">E-mail</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="convenio@mail.com"
                className={`ds-input ${emailError ? "border-red-400" : ""}`}
              />
              {emailError && (
                <span className="text-xs text-red-500">{emailError}</span>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200" />
          <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4">
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="ds-btn-primary"
            >
              {loading ? "Adicionando..." : "Adicionar convênio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
