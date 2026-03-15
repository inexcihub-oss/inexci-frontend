"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { collaboratorService } from "@/services/collaborator.service";
import api from "@/lib/api";

interface NewDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  specialty: "",
  crm: "",
  crm_state: "",
};

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

export function NewDoctorModal({
  isOpen,
  onClose,
  onSuccess,
}: NewDoctorModalProps) {
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
      // Passo 1: criar o usuário com role=doctor
      const newUser = await collaboratorService.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        role: "doctor",
      });

      // Passo 2: se specialty/crm/crm_state foram preenchidos, atualizar via PATCH
      const hasExtra = formData.specialty || formData.crm || formData.crm_state;
      if (hasExtra && newUser?.id) {
        const profilePayload: Record<string, string> = {};
        if (formData.specialty) profilePayload.specialty = formData.specialty;
        if (formData.crm) profilePayload.crm = formData.crm;
        if (formData.crm_state) profilePayload.crm_state = formData.crm_state;
        try {
          await api.patch(`/users/${newUser.id}`, profilePayload);
        } catch {
          // Não bloquear criação se o update falhar
        }
      }

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
          : msg || "Erro ao criar médico. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-3 border border-[#DCDFE3] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-sm font-bold text-gray-900";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="text-[28px] font-bold text-gray-900 leading-tight">
            Novo médico
          </h2>
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
          <div className="px-6 py-6 flex flex-col gap-5 overflow-y-auto">
            {/* Row 1: Nome + Telefone */}
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
                <label className={labelClass}>Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(21) 98765-4321"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: E-mail (full width) */}
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
                placeholder="medico@mail.com"
                className={`${inputClass} ${emailError ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {emailError && (
                <span className="text-xs text-red-500">{emailError}</span>
              )}
            </div>

            {/* Row 3: Especialidade (full width) */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Especialidade</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
                placeholder="Ex: Ortopedia, Cardiologia..."
                className={inputClass}
              />
            </div>

            {/* Row 4: CRM + Estado do CRM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>CRM</label>
                <input
                  type="text"
                  value={formData.crm}
                  onChange={(e) =>
                    setFormData({ ...formData, crm: e.target.value })
                  }
                  placeholder="123456"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Estado do CRM</label>
                <select
                  value={formData.crm_state}
                  onChange={(e) =>
                    setFormData({ ...formData, crm_state: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  {STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-center justify-end px-6 py-4 flex-shrink-0">
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="px-6 py-3 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adicionando..." : "Adicionar médico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
