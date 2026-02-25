"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  hospitalService,
  CreateHospitalPayload,
  Hospital,
} from "@/services/hospital.service";

interface CreateHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hospital: Hospital) => void;
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyCepMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const ESTADOS_BR = [
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

type FormData = {
  name: string;
  phone: string;
  email: string;
  zip_code: string;
  address: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  phone: "",
  email: "",
  zip_code: "",
  address: "",
  address_number: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function CreateHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateHospitalModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");

  const set = (field: keyof FormData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    set("phone")(applyPhoneMask(e.target.value));

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    set("zip_code")(applyCepMask(e.target.value));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set("email")(e.target.value);
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
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError("E-mail inválido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: CreateHospitalPayload = {
        name: formData.name.trim(),
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        zip_code: formData.zip_code.replace(/\D/g, "") || undefined,
        address: formData.address.trim() || undefined,
        address_number: formData.address_number.trim() || undefined,
        neighborhood: formData.neighborhood.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state || undefined,
      };
      const newHospital = await hospitalService.create(payload);
      onSuccess(newHospital);
      setFormData(EMPTY_FORM);
      setEmailError("");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
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

  const inputClass =
    "w-full px-4 py-3 border border-[#DCDFE3] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-[600px] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="text-[28px] font-bold text-gray-900 leading-tight">
            Novo hospital
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
          <div className="px-6 py-6 flex flex-col gap-5">
            {/* Hospital */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-900">
                Hospital
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Nome do hospital"
                className={inputClass}
              />
            </div>

            {/* Telefone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-900">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(21) 98765-4321"
                className={inputClass}
              />
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-900">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="hospital@mail.com"
                className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  emailError ? "border-red-400" : "border-[#DCDFE3]"
                }`}
              />
              {emailError && (
                <span className="text-xs text-red-500">{emailError}</span>
              )}
            </div>

            {/* CEP + Número */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">CEP</label>
                <input
                  type="text"
                  required
                  value={formData.zip_code}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  className={inputClass}
                />
              </div>
              <div className="w-32 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">
                  Número
                </label>
                <input
                  type="text"
                  required
                  value={formData.address_number}
                  onChange={(e) => set("address_number")(e.target.value)}
                  placeholder="123"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Endereço + Bairro */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">
                  Endereço
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => set("address")(e.target.value)}
                  placeholder="Rua, Avenida..."
                  className={inputClass}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">
                  Bairro
                </label>
                <input
                  type="text"
                  required
                  value={formData.neighborhood}
                  onChange={(e) => set("neighborhood")(e.target.value)}
                  placeholder="Nome do bairro"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Cidade + Estado */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">
                  Cidade
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => set("city")(e.target.value)}
                  placeholder="São Paulo"
                  className={inputClass}
                />
              </div>
              <div className="w-24 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">
                  Estado
                </label>
                <select
                  required
                  value={formData.state}
                  onChange={(e) => set("state")(e.target.value)}
                  className="w-full px-3 py-3 border border-[#DCDFE3] rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => (
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
              {loading ? "Adicionando..." : "Adicionar hospital"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
