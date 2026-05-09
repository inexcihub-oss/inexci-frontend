"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  hospitalService,
  CreateHospitalPayload,
  Hospital,
} from "@/services/hospital.service";
import { getApiErrorMessage } from "@/lib/http-error";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createHospitalSchema } from "@/lib/schemas/hospital.schema";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { useCepLookup } from "@/hooks/useCepLookup";
import { Loader2 } from "lucide-react";

interface CreateHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hospital: Hospital) => void;
}

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const FIELD_LABELS: Record<string, string> = {
  name: "Hospital",
  phone: "Telefone",
  email: "E-mail",
  zip_code: "CEP",
  address_number: "Número",
  address: "Endereço",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado",
};

export function CreateHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateHospitalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createHospitalSchema,
    initialValues: {
      name: "",
      phone: "",
      email: "",
      zip_code: "",
      address_number: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const { loading: cepLoading } = useCepLookup({
    cep: form.values.zip_code,
    enabled: isOpen,
    onResolved: (data) => {
      form.setValues({
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.cidade,
        state: data.uf,
      });
    },
    onError: (err) => {
      if (err.code === "not_found") {
        showToast("CEP não encontrado.", "error");
      } else if (err.code === "network") {
        showToast(err.message, "error");
      }
    },
  });

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
        const payload: CreateHospitalPayload = {
          name: data.name.trim(),
          phone: unmask(data.phone) || undefined,
          email: data.email || undefined,
          zip_code: unmask(data.zip_code) || undefined,
          address: data.address.trim() || undefined,
          address_number: data.address_number.trim() || undefined,
          neighborhood: data.neighborhood.trim() || undefined,
          city: data.city.trim() || undefined,
          state: data.state || undefined,
        };
        const newHospital = await hospitalService.create(payload);
        onSuccess(newHospital);
        form.reset();
        onClose();
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, "Erro ao criar hospital. Tente novamente."),
        );
      } finally {
        setLoading(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-[600px] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
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
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
            <Input
              label="Hospital"
              required
              placeholder="Nome do hospital"
              {...form.getFieldProps("name")}
            />

            <Input
              label="Telefone"
              type="tel"
              mask="phone"
              placeholder="(21) 98765-4321"
              {...form.getFieldProps("phone")}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="hospital@mail.com"
              {...form.getFieldProps("email")}
            />

            {/* CEP + Número */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  label="CEP"
                  mask="cep"
                  required
                  placeholder="00000-000"
                  {...form.getFieldProps("zip_code")}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-9 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
              <div className="w-32">
                <Input
                  label="Número"
                  required
                  placeholder="123"
                  {...form.getFieldProps("address_number")}
                />
              </div>
            </div>

            {/* Endereço + Bairro */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  label="Endereço"
                  required
                  placeholder="Rua, Avenida..."
                  {...form.getFieldProps("address")}
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Bairro"
                  required
                  placeholder="Nome do bairro"
                  {...form.getFieldProps("neighborhood")}
                />
              </div>
            </div>

            {/* Cidade + Estado */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  label="Cidade"
                  required
                  placeholder="São Paulo"
                  {...form.getFieldProps("city")}
                />
              </div>
              <div className="w-24 flex flex-col gap-1.5">
                <label className="ds-label mb-0">
                  Estado<span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  required
                  value={form.values.state}
                  onChange={(e) => form.setField("state", e.target.value)}
                  className="ds-input"
                >
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
                {form.errors.state && (
                  <p className="text-xs text-red-600">{form.errors.state}</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              {loading ? "Adicionando..." : "Adicionar hospital"}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
