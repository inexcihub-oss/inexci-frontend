"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  healthPlanService,
  CreateHealthPlanPayload,
} from "@/services/health-plan.service";
import { maskCnpj, maskPhone, unmask } from "@/lib/masks";

interface NewHealthPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  cnpj: "",
};

function applyPhoneMask(value: string): string {
  return maskPhone(value);
}

function applyCnpjMask(value: string): string {
  return maskCnpj(value);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function NewHealthPlanModal({
  isOpen,
  onClose,
  onSuccess,
}: NewHealthPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");

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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cnpj: applyCnpjMask(e.target.value) });
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
    if (!formData.name.trim()) {
      setError("Nome do convênio é obrigatório.");
      return;
    }
    if (formData.email.trim() && !isValidEmail(formData.email.trim())) {
      setEmailError("E-mail inválido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const phone = unmask(formData.phone);
      const email = formData.email.trim();

      const payload: CreateHealthPlanPayload = {
        name: formData.name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        cnpj: unmask(formData.cnpj) || undefined,
      };

      await healthPlanService.create(payload);
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
          : msg || "Erro ao criar convênio. Tente novamente.",
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
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh] mobile-sheet-offset">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 flex-shrink-0">
          <h2 className="ds-modal-title">Novo convênio</h2>
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
            {/* Row 1: Nome + CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  aria-required="true"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do convênio"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>CNPJ (opcional)</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  placeholder="12.345.678/0001-90"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: Telefone + E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Telefone (opcional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(21) 98765-4321"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>E-mail (opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="convenio@mail.com"
                  className={`${inputClass} ${emailError ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {emailError && (
                  <span className="text-xs text-red-500">{emailError}</span>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="ds-modal-footer">
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
