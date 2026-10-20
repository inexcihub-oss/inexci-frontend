"use client";

import { useState, useEffect } from "react";
import {
  collaboratorService,
  CreateCollaboratorPayload,
} from "@/services/collaborator.service";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { createCollaboratorSchema } from "@/lib/schemas/collaborator.schema";
import { unmask } from "@/lib/masks";
import { isValidEmail } from "@/lib/validators";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { PermissionsSection } from "@/components/colaboradores/PermissionsSection";
import { PROFILE_PRESETS } from "@/lib/permissions";
import {
  COUNCIL_OPTIONS,
  ProfessionalCouncil,
} from "@/lib/professional-council";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { useInvalidateAvailableDoctors } from "@/hooks/useAvailableDoctors";

interface NewCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  council: "Conselho",
  crm: "Número no conselho",
  crmState: "UF do conselho",
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
  const { showToast } = useToast();
  const { emTour } = useOnboarding();
  const invalidateAvailableDoctors = useInvalidateAvailableDoctors();

  const form = useZodForm({
    schema: createCollaboratorSchema,
    initialValues: {
      name: "",
      email: "",
      phone: "",
      isDoctor: defaultIsDoctor,
      council: "CRM",
      crm: "",
      crmState: "",
      specialty: "",
      permissions: PROFILE_PRESETS.completo,
    },
  });
  const isCrm = (form.values.council ?? "CRM") === "CRM";

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
      council: "CRM",
      crm: "",
      crmState: "",
      specialty: "",
      permissions: PROFILE_PRESETS.completo,
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
          permissions: data.permissions,
          ...(data.isDoctor && {
            isDoctor: true,
            council: data.council,
            crm: data.crm?.trim() || undefined,
            crmState: data.crmState || undefined,
            specialty: data.specialty?.trim() || undefined,
          }),
        };
        await collaboratorService.create(payload);
        void invalidateAvailableDoctors();
        onSuccess();
        form.reset({
          name: "",
          email: "",
          phone: "",
          isDoctor: defaultIsDoctor,
          council: "CRM",
          crm: "",
          crmState: "",
          specialty: "",
          permissions: PROFILE_PRESETS.completo,
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={defaultIsDoctor ? "Novo médico" : "Novo colaborador"}
        disableClose={loading}
      >
        <form onSubmit={onSubmit} noValidate>
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Nome completo</label>
                <Input
                  type="text"
                  required
                  value={form.values.name}
                  onChange={(e) => form.setField("name", e.target.value)}
                  placeholder="Nome completo"
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

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>E-mail</label>
              <Input
                type="email"
                required
                value={form.values.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="colaborador@mail.com"
                className={
                  emailError || form.errors.email
                    ? "border-red-400 focus:ring-red-400"
                    : undefined
                }
              />
              {(emailError || form.errors.email) && (
                <span className="text-xs text-red-500">
                  {emailError || form.errors.email}
                </span>
              )}
            </div>

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
                Este colaborador é profissional de saúde (atende pacientes)
              </span>
            </div>

            {form.values.isDoctor && (
              <div className="space-y-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="collaborator-council" className={labelClass}>
                    Conselho
                  </label>
                  <select
                    id="collaborator-council"
                    value={form.values.council ?? "CRM"}
                    onChange={(e) =>
                      form.setField(
                        "council",
                        e.target.value as ProfessionalCouncil,
                      )
                    }
                    className={inputClass}
                  >
                    {COUNCIL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {!isCrm && (
                    <span className="text-xs text-gray-500">
                      Tem agenda e prontuário próprios. Receita, atestado,
                      pedido de exame e indicação cirúrgica são do médico (CRM).
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>
                      Número no conselho
                      {!isCrm && (
                        <span className="text-gray-400 font-normal">
                          {" "}
                          (opcional)
                        </span>
                      )}
                    </label>
                    <Input
                      type="text"
                      aria-label="Número no conselho"
                      required={form.values.isDoctor && isCrm}
                      value={form.values.crm}
                      onChange={(e) => form.setField("crm", e.target.value)}
                      placeholder="123456"
                    />
                    {form.errors.crm && (
                      <span className="text-xs text-red-500">
                        {form.errors.crm}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>
                      UF do conselho
                      {!isCrm && (
                        <span className="text-gray-400 font-normal">
                          {" "}
                          (opcional)
                        </span>
                      )}
                    </label>
                    <select
                      aria-label="UF do conselho"
                      required={form.values.isDoctor && isCrm}
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
                  <Input
                    type="text"
                    value={form.values.specialty}
                    onChange={(e) => form.setField("specialty", e.target.value)}
                    placeholder="Ex: Ortopedia, Cardiologia..."
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:pt-5">
              <h3 className="ds-section-title">Permissões de acesso</h3>
              <PermissionsSection
                value={form.values.permissions ?? []}
                isDoctor={!!form.values.isDoctor}
                isPhysician={isCrm}
                onChange={(p) => form.setField("permissions", p)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          <ModalFooter align="end">
            <button
              type="submit"
              disabled={loading || !!emailError || emTour}
              className="ds-btn-primary"
            >
              {loading
                ? "Adicionando..."
                : defaultIsDoctor
                  ? "Adicionar médico"
                  : "Adicionar colaborador"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

    </>
  );
}
