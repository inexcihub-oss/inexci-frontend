"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  hospitalService,
  CreateHospitalPayload,
} from "@/services/hospital.service";

interface NewHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  city: "",
  state: "",
};

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

export function NewHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: NewHospitalModalProps) {
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
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: CreateHospitalPayload = {
        name: formData.name.trim(),
        cnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, "") : undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
      };

      await hospitalService.create(payload);
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
          : msg || "Erro ao criar hospital. Tente novamente.",
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
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 flex-shrink-0">
          <h2 className="ds-modal-title">Novo hospital</h2>
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
                <label className={labelClass}>
                  <span className="text-red-500 mr-0.5">*</span>Nome
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do hospital"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>CNPJ</label>
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
                <label className={labelClass}>Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(21) 98765-4321"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="hospital@mail.com"
                  className={`${inputClass} ${emailError ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {emailError && (
                  <span className="text-xs text-red-500">{emailError}</span>
                )}
              </div>
            </div>

            {/* Row 3: Cidade + Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Cidade</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="Cidade"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Estado</label>
                <select
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
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
          <div className="ds-modal-footer">
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="ds-btn-primary"
            >
              {loading ? "Adicionando..." : "Adicionar hospital"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
