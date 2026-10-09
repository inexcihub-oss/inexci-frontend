"use client";

import { useState, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import {
  patientService,
  CreatePatientPayload,
  Patient,
} from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { GENDER_OPTIONS } from "@/lib/options";
import { DateInput } from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import { HealthPlanComboboxField } from "@/components/patients/HealthPlanComboboxField";
import { useZodForm } from "@/hooks/useZodForm";
import {
  mensagemCpfRepetido,
  useCpfRepetido,
} from "@/components/patients/useCpfRepetido";
import { createPatientSchema } from "@/lib/schemas/patient.schema";
import { phoneOptionalSchema } from "@/lib/schemas/shared";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea } from "@/lib/permissions";
import { uploadService } from "@/services/upload.service";
import { PatientPhotoInput } from "@/components/patients/PatientPhotoInput";

const novoPacienteSchema = createPatientSchema.extend({
  secondaryPhone: phoneOptionalSchema,
});

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  cpf: "CPF",
  phone: "Telefone",
  secondaryPhone: "Telefone secundário",
  email: "E-mail",
  birthDate: "Data de nascimento",
  gender: "Gênero",
  healthPlanId: "Convênio",
};

const labelClass = "ds-label mb-0";
const inputClass = "ds-input";

export function NewPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: NewPatientModalProps) {
  const { permissions } = useAuth();
  const podeCriarConvenio = hasAnyArea(permissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [foto, setFoto] = useState<File | null>(null);
  const fotoEnviadaRef = useRef<{ file: File; path: string } | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const form = useZodForm({
    schema: novoPacienteSchema,
    initialValues: {
      name: "",
      cpf: "",
      phone: "",
      secondaryPhone: "",
      email: "",
      birthDate: "",
      gender: "",
      healthPlanId: "",
    },
  });
  const avisoCpf = mensagemCpfRepetido(useCpfRepetido(form.values.cpf ?? ""));

  useEffect(() => {
    if (isOpen) {
      setError("");
      loadHealthPlans();
    }
  }, [isOpen]);

  const loadHealthPlans = async () => {
    try {
      const data = await healthPlanService.getAll();
      setHealthPlans(data);
    } catch {
    }
  };

  const descartarFotoEnviada = () => {
    const enviada = fotoEnviadaRef.current;
    fotoEnviadaRef.current = null;
    if (enviada) void patientService.discardPhoto(enviada.path);
  };

  const handleClose = () => {
    if (loading) return;
    form.reset();
    setFoto(null);
    descartarFotoEnviada();
    setError("");
    onClose();
  };

  const tituloId = useId();
  const caixaRef = useRef<HTMLDivElement>(null);
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const foco = document.activeElement;
      if (
        foco &&
        foco !== document.body &&
        !caixaRef.current?.contains(foco)
      )
        return;
      e.stopPropagation();
      handleCloseRef.current();
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [isOpen]);

  const onSubmit = form.handleSubmit(
    async (data) => {
      setLoading(true);
      setError("");
      try {
        const payload: CreatePatientPayload = {
          name: data.name.trim(),
          cpf: data.cpf ? unmask(data.cpf) : undefined,
          phone: data.phone ? unmask(data.phone) : undefined,
          secondaryPhone: data.secondaryPhone
            ? unmask(data.secondaryPhone)
            : undefined,
          email: data.email || undefined,
          birthDate: data.birthDate || undefined,
          gender: data.gender || undefined,
          healthPlanId: data.healthPlanId || undefined,
        };
        if (foto) {
          try {
            let enviada = fotoEnviadaRef.current;
            if (enviada?.file !== foto) {
              descartarFotoEnviada();
              const resposta = await uploadService.uploadSingle(
                foto,
                "patient-photos",
              );
              enviada = { file: foto, path: resposta.data.path };
              fotoEnviadaRef.current = enviada;
            }
            payload.photoPath = enviada.path;
          } catch {
            setError(
              "Não foi possível enviar a foto. Tente de novo ou cadastre sem foto.",
            );
            return;
          }
        }
        const created = await patientService.create(payload);
        onSuccess(created);
        form.reset();
        setFoto(null);
        if (fotoEnviadaRef.current?.path === payload.photoPath) {
          fotoEnviadaRef.current = null;
        } else {
          descartarFotoEnviada();
        }
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

      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col sm:mx-4 w-full sm:max-w-2xl max-h-[90vh] mobile-sheet-offset"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 id={tituloId} className="ds-modal-title">
            Novo paciente
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="h-px bg-gray-200 flex-shrink-0" />

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5 overflow-y-auto">
            <PatientPhotoInput value={foto} onChange={setFoto} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                aria-required="true"
                placeholder="Nome completo"
                {...form.getFieldProps("name")}
              />
              <Input
                label="CPF (opcional)"
                mask="cpf"
                placeholder="123.456.789-00"
                {...form.getFieldProps("cpf")}
              />
            </div>
            {avisoCpf && (
              <p
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
              >
                {avisoCpf}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone (opcional)"
                type="tel"
                mask="phone"
                placeholder="(21) 98765-4321"
                {...form.getFieldProps("phone")}
              />
              <Input
                label="Telefone secundário (opcional)"
                type="tel"
                mask="phone"
                placeholder="Fixo ou recado"
                {...form.getFieldProps("secondaryPhone")}
              />
            </div>

            <Input
              label="E-mail (opcional)"
              type="email"
              placeholder="paciente@mail.com"
              {...form.getFieldProps("email")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Data de nascimento (opcional)"
                value={form.values.birthDate ?? ""}
                onChange={(v) => form.setField("birthDate", v)}
                className={inputClass}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="novo-paciente-genero" className={labelClass}>
                  Gênero (opcional)
                </label>
                <select
                  id="novo-paciente-genero"
                  value={form.values.gender ?? ""}
                  onChange={(e) => form.setField("gender", e.target.value)}
                  className={inputClass}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <HealthPlanComboboxField
              label="Convênio (opcional)"
              healthPlans={healthPlans}
              value={form.values.healthPlanId ?? ""}
              onChange={(id) => form.setField("healthPlanId", id)}
              onHealthPlanCreated={(plan) =>
                setHealthPlans((prev) => [...prev, plan])
              }
              canCreate={podeCriarConvenio}
            />

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Obs.: Não será possível notificar o paciente sem os dados de
              telefone e e-mail.
            </p>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          <div className="h-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
            <button type="submit" disabled={loading} className="ds-btn-primary">
              {loading ? "Adicionando..." : "Adicionar paciente"}
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
