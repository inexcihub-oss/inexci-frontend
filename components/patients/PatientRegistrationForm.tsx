"use client";

import { useEffect, useState } from "react";
import { FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { HealthPlanComboboxField } from "@/components/patients/HealthPlanComboboxField";
import { patientService, Patient } from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { GENDER_OPTIONS, STATE_OPTIONS } from "@/lib/options";
import { maskCpf, maskPhone } from "@/lib/masks";
import { maskCep } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";
import {
  mensagemCpfRepetido,
  useCpfRepetido,
} from "@/components/patients/useCpfRepetido";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea } from "@/lib/permissions";
import { cpfOptionalSchema } from "@/lib/schemas/shared";

interface FormData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  birthDate: string;
  gender: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  healthPlanId: string;
  healthPlanNumber: string;
  healthPlanType: string;
  medicalNotes: string;
}

function formDataFrom(patient: Patient): FormData {
  return {
    name: patient.name || "",
    cpf: patient.cpf || "",
    email: patient.email || "",
    phone: patient.phone || "",
    secondaryPhone: patient.secondaryPhone || "",
    birthDate: patient.birthDate || "",
    gender: patient.gender || "",
    address: patient.address || "",
    addressNumber: patient.addressNumber || "",
    addressComplement: patient.addressComplement || "",
    neighborhood: patient.neighborhood || "",
    city: patient.city || "",
    state: patient.state || "",
    zipCode: maskCep(patient.zipCode || ""),
    healthPlanId: patient.healthPlanId || "",
    healthPlanNumber: patient.healthPlanNumber || "",
    healthPlanType: patient.healthPlanType || "",
    medicalNotes: patient.medicalNotes || "",
  };
}

/**
 * Formulário de cadastro do paciente (informações pessoais, endereço e
 * convênio). Compartilhado pela página de detalhe do paciente e pela aba
 * Cadastro da tela de atendimento — por isso ele é dono do próprio estado
 * "sujo" e do próprio salvamento, independente de qualquer outro formulário
 * da tela.
 */
export function PatientRegistrationForm({
  patient,
  onSaved,
  onCancel,
}: {
  patient: Patient;
  onSaved: (patient: Patient) => void;
  onCancel?: () => void;
}) {
  const { permissions } = useAuth();
  // Convênio é cadastro transversal (`@RequireAnyArea()` em
  // `HealthPlansController`): qualquer área cria, quem não tem área nenhuma
  // não. Exigir ADMINISTRACAO aqui escondia o atalho de quem edita paciente.
  const podeCriarConvenio = hasAnyArea(permissions);
  const [formData, setFormData] = useState<FormData>(() =>
    formDataFrom(patient),
  );
  const avisoCpf = mensagemCpfRepetido(
    useCpfRepetido(formData.cpf, patient.id),
  );
  const [baseline, setBaseline] = useState<FormData>(() =>
    formDataFrom(patient),
  );
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(baseline);

  useEffect(() => {
    let active = true;
    healthPlanService
      .getAll()
      .then((plans) => active && setHealthPlans(plans))
      .catch(() => active && setHealthPlans([]));
    return () => {
      active = false;
    };
  }, []);

  const { loading: cepLoading } = useCepLookup({
    cep: formData.zipCode,
    onResolved: (data) => {
      setFormData((prev) => ({
        ...prev,
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.cidade,
        state: data.uf,
      }));
    },
    onError: (err) => setError(err.message),
  });

  const setField = (field: keyof FormData, value: string) => {
    setError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const cpf = formData.cpf.replace(/\D/g, "");
    // CPF é opcional (estrangeiros, menores, pacientes migrados), mas quando
    // informado passa pela mesma validação do cadastro (11 dígitos + dígitos
    // verificadores). A SC continua cobrando CPF como pendência antes de
    // avançar. Só valida se o CPF mudou: paciente migrado com CPF inválido
    // gravado continua editável nos outros campos sem ser obrigado a mexer
    // no CPF.
    const cpfMudou = cpf !== baseline.cpf.replace(/\D/g, "");
    if (cpfMudou) {
      const validacao = cpfOptionalSchema.safeParse(cpf);
      if (!validacao.success) {
        setError(validacao.error.issues[0]?.message ?? "CPF inválido.");
        return;
      }
    }

    setSaving(true);
    try {
      const saved = await patientService.update(patient.id, {
        name: formData.name,
        // Vão sempre, mesmo vazios: `""` é como o backend sabe que é para
        // apagar (vira `null`). `undefined` significaria "não mexer".
        cpf,
        secondaryPhone: formData.secondaryPhone,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        addressNumber: formData.addressNumber || undefined,
        addressComplement: formData.addressComplement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode.replace(/\D/g, "") || undefined,
        healthPlanId: formData.healthPlanId || undefined,
        healthPlanNumber: formData.healthPlanNumber || undefined,
        healthPlanType: formData.healthPlanType || undefined,
        medicalNotes: formData.medicalNotes || undefined,
      });
      setBaseline(formData);
      onSaved(saved);
    } catch (err) {
      logger.error("Erro ao salvar paciente:", err);
      setError(getApiErrorMessage(err, "Erro ao salvar as alterações."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setFormData(baseline);
      setError(null);
      return;
    }
    onCancel?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <FormSection title="Informações pessoais">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nome completo"
            value={formData.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
          <Input
            label="CPF"
            value={maskCpf(formData.cpf)}
            onChange={(e) =>
              setField("cpf", e.target.value.replace(/\D/g, ""))
            }
            placeholder="000.000.000-00"
          />
          <DateInput
            label="Data de nascimento"
            value={formData.birthDate}
            onChange={(v) => setField("birthDate", v)}
          />
          <Select
            label="Gênero"
            value={formData.gender}
            onChange={(e) => setField("gender", e.target.value)}
            options={GENDER_OPTIONS}
          />
          <Input
            label="Telefone"
            value={maskPhone(formData.phone)}
            onChange={(e) =>
              setField("phone", e.target.value.replace(/\D/g, ""))
            }
            placeholder="(00) 00000-0000"
          />
          <Input
            label="Telefone secundário"
            value={maskPhone(formData.secondaryPhone)}
            onChange={(e) =>
              setField("secondaryPhone", e.target.value.replace(/\D/g, ""))
            }
            placeholder="Fixo ou recado"
          />
          <Input
            label="E-mail"
            type="email"
            value={formData.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>
        {avisoCpf && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            {avisoCpf}
          </p>
        )}
      </FormSection>

      <FormSection title="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <Input
              label="CEP"
              mask="cep"
              value={formData.zipCode}
              onChange={(e) => setField("zipCode", e.target.value)}
              placeholder="00000-000"
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-9 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <Select
            label="Estado"
            value={formData.state}
            onChange={(e) => setField("state", e.target.value)}
            options={STATE_OPTIONS}
          />
          <div className="md:col-span-2">
            <Input
              label="Logradouro"
              value={formData.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Rua / Avenida / Travessa"
            />
          </div>
          <Input
            label="Número"
            value={formData.addressNumber}
            onChange={(e) => setField("addressNumber", e.target.value)}
          />
          <Input
            label="Complemento"
            value={formData.addressComplement}
            onChange={(e) => setField("addressComplement", e.target.value)}
          />
          <Input
            label="Bairro"
            value={formData.neighborhood}
            onChange={(e) => setField("neighborhood", e.target.value)}
          />
          <Input
            label="Cidade"
            value={formData.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Convênio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HealthPlanComboboxField
            label="Convênio"
            healthPlans={healthPlans}
            value={formData.healthPlanId}
            onChange={(id) => setField("healthPlanId", id)}
            onHealthPlanCreated={(plan) =>
              setHealthPlans((prev) => [...prev, plan])
            }
            canCreate={podeCriarConvenio}
          />
          <Input
            label="Número da carteirinha"
            value={formData.healthPlanNumber}
            onChange={(e) => setField("healthPlanNumber", e.target.value)}
            placeholder="Número do convênio"
          />
        </div>
      </FormSection>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="min-h-[44px] rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={!isDirty}
          className="min-h-[44px] rounded-xl"
        >
          Salvar dados do paciente
        </Button>
      </div>
    </div>
  );
}
