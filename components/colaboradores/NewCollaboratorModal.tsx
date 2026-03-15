"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  collaboratorService,
  CreateCollaboratorPayload,
} from "@/services/collaborator.service";

interface NewCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "collaborator" as "admin" | "collaborator",
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

export function NewCollaboratorModal({
  isOpen,
  onClose,
  onSuccess,
}: NewCollaboratorModalProps) {
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
      const payload: CreateCollaboratorPayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        role: formData.role,
      };

      await collaboratorService.create(payload);
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
          : msg || "Erro ao criar colaborador. Tente novamente.",
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
            Novo colaborador
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

            {/* Row 2: E-mail + Permissão */}
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
                  placeholder="colaborador@mail.com"
                  className={`${inputClass} ${emailError ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {emailError && (
                  <span className="text-xs text-red-500">{emailError}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <span className="text-red-500 mr-0.5">*</span>Permissão
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "admin" | "collaborator",
                    })
                  }
                  className={inputClass}
                >
                  <option value="collaborator">Colaborador</option>
                  <option value="admin">Administrador</option>
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
              {loading ? "Adicionando..." : "Adicionar colaborador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
