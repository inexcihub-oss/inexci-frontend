"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  collaboratorService,
  CreateCollaboratorPayload,
} from "@/services/collaborator.service";
import Input from "@/components/ui/Input";
import { useZodForm } from "@/hooks/useZodForm";
import { createCollaboratorSchema } from "@/lib/schemas/collaborator.schema";
import { unmask } from "@/lib/masks";
import { isValidEmail } from "@/lib/validators";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

interface NewCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Quando true, o toggle "É médico" é pré-ativado e o título/botão mudam para "Novo médico" */
  defaultIsDoctor?: boolean;
}

const BRAZILIAN_STATES = [
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

const FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  crm: "CRM",
  crmState: "UF do CRM",
};

const inputClass = "ds-input";
const labelClass = "ds-label mb-0";

export function NewCollaboratorModal({
  isOpen,
  onClose,
  onSuccess,
  defaultIsDoctor = false,
}: NewCollaboratorModalProps) {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: createCollaboratorSchema,
    initialValues: {
      name: "",
      email: "",
      phone: "",
      isDoctor: defaultIsDoctor,
      crm: "",
      crmState: "",
      specialty: "",
    },
  });

  // Mantém is_doctor sincronizado quando defaultIsDoctor mudar
  useEffect(() => {
    form.setField("isDoctor", defaultIsDoctor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultIsDoctor]);

  const handleClose = () => {
    if (loading) return;
    form.reset({
      name: "",
      email: "",
      phone: "",
      isDoctor: defaultIsDoctor,
      crm: "",
      crmState: "",
      specialty: "",
    });
    setEmailError("");
    setError("");
    onClose();
  };

  const handleEmailBlur = () => {
    const value = form.values.email;
    if (value && !isValidEmail(value)) {
      setEmailError("E-mail inválido");
    } else {
      setEmailError("");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setField("email", e.target.value);
    if (emailError) setEmailError("");
  };

  const onSubmit = form.handleSubmit(
    async (data) => {
      setLoading(true);
      setError("");
      try {
        const payload: CreateCollaboratorPayload = {
          name: data.name.trim(),
          email: data.email.trim(),
          phone: unmask(data.phone),
          ...(data.isDoctor &&
            data.crm &&
            data.crm.trim() && {
              isDoctor: true,
              crm: data.crm.trim(),
              crmState: data.crmState || undefined,
              specialty: data.specialty?.trim() || undefined,
            }),
        };
        await collaboratorService.create(payload);
        onSuccess();
        form.reset({
          name: "",
          email: "",
          phone: "",
          isDoctor: defaultIsDoctor,
          crm: "",
          crmState: "",
          specialty: "",
        });
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
            : msg ||
                (defaultIsDoctor
                  ? "Erro ao criar médico. Tente novamente."
                  : "Erro ao criar colaborador. Tente novamente."),
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
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 flex-shrink-0">
          <h2 className="ds-modal-title">
            {defaultIsDoctor ? "Novo médico" : "Novo colaborador"}
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
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5 overflow-y-auto">
            {/* Row 1: Nome + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Nome completo</label>
                <input
                  type="text"
                  required
                  value={form.values.name}
                  onChange={(e) => form.setField("name", e.target.value)}
                  placeholder="Nome completo"
                  className={inputClass}
                />
                {form.errors.name && (
                  <span className="text-xs text-red-500">
                    {form.errors.name}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Telefone</label>
                <Input
                  type="tel"
                  mask="phone"
                  placeholder="(21) 98765-4321"
                  value={form.values.phone}
                  onChange={(e) => form.setField("phone", e.target.value)}
                  error={form.errors.phone}
                />
              </div>
            </div>

            {/* Row 2: E-mail */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>E-mail</label>
              <input
                type="email"
                required
                value={form.values.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="colaborador@mail.com"
                className={`${inputClass} ${emailError || form.errors.email ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {(emailError || form.errors.email) && (
                <span className="text-xs text-red-500">
                  {emailError || form.errors.email}
                </span>
              )}
            </div>

            {/* Is Doctor Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.values.isDoctor}
                onClick={() => form.setField("isDoctor", !form.values.isDoctor)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                  form.values.isDoctor ? "bg-teal-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.values.isDoctor ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                Este colaborador é médico(a)
              </span>
            </div>

            {/* Doctor Fields (conditional) */}
            {form.values.isDoctor && (
              <div className="space-y-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>CRM</label>
                    <input
                      type="text"
                      required={form.values.isDoctor}
                      value={form.values.crm}
                      onChange={(e) => form.setField("crm", e.target.value)}
                      placeholder="123456"
                      className={inputClass}
                    />
                    {form.errors.crm && (
                      <span className="text-xs text-red-500">
                        {form.errors.crm}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>UF do CRM</label>
                    <select
                      required={form.values.isDoctor}
                      value={form.values.crmState}
                      onChange={(e) =>
                        form.setField("crmState", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Selecione</option>
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                    {form.errors.crmState && (
                      <span className="text-xs text-red-500">
                        {form.errors.crmState}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>
                    Especialidade{" "}
                    <span className="text-gray-400 font-normal">
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.values.specialty}
                    onChange={(e) => form.setField("specialty", e.target.value)}
                    placeholder="Ex: Ortopedia, Cardiologia..."
                    className={inputClass}
                  />
                </div>
              </div>
            )}

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
              {loading
                ? "Adicionando..."
                : defaultIsDoctor
                  ? "Adicionar médico"
                  : "Adicionar colaborador"}
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
