"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { Toast } from "@/components/ui/Toast";
import { patientService, Patient } from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { formatCPF, formatPhone } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { ChevronRight } from "lucide-react";

export default function PacienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const { toast, showToast, hideToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    birth_date: "",
    gender: "",
    address: "",
    address_number: "",
    address_complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    health_plan_id: "",
    health_plan_number: "",
    health_plan_type: "",
    medical_notes: "",
  });
  const [originalData, setOriginalData] = useState<typeof formData | null>(
    null,
  );
  const isDirty =
    originalData !== null &&
    JSON.stringify(formData) !== JSON.stringify(originalData);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientData, healthPlansData] = await Promise.all([
        patientService.getById(params.id),
        healthPlanService.getAll(),
      ]);

      if (!patientData) {
        console.error("Paciente não encontrado");
        setLoading(false);
        return;
      }

      setPatient(patientData);
      setHealthPlans(healthPlansData);

      // Preenche o formulário
      setFormData({
        name: patientData.name || "",
        cpf: patientData.cpf || "",
        email: patientData.email || "",
        phone: patientData.phone || "",
        birth_date: patientData.birth_date || "",
        gender: patientData.gender || "",
        address: patientData.address || "",
        address_number: patientData.address_number || "",
        address_complement: patientData.address_complement || "",
        neighborhood: patientData.neighborhood || "",
        city: patientData.city || "",
        state: patientData.state || "",
        zip_code: patientData.zip_code || "",
        health_plan_id: patientData.health_plan_id || "",
        health_plan_number: patientData.health_plan_number || "",
        health_plan_type: patientData.health_plan_type || "",
        medical_notes: patientData.medical_notes || "",
      });
      setOriginalData({
        name: patientData.name || "",
        cpf: patientData.cpf || "",
        email: patientData.email || "",
        phone: patientData.phone || "",
        birth_date: patientData.birth_date || "",
        gender: patientData.gender || "",
        address: patientData.address || "",
        address_number: patientData.address_number || "",
        address_complement: patientData.address_complement || "",
        neighborhood: patientData.neighborhood || "",
        city: patientData.city || "",
        state: patientData.state || "",
        zip_code: patientData.zip_code || "",
        health_plan_id: patientData.health_plan_id || "",
        health_plan_number: patientData.health_plan_number || "",
        health_plan_type: patientData.health_plan_type || "",
        medical_notes: patientData.medical_notes || "",
      });
    } catch (error) {
      console.error("Erro ao carregar paciente:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!patient) return;

    setSaving(true);
    try {
      await patientService.update(patient.id, {
        name: formData.name,
        cpf: formData.cpf || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        address_number: formData.address_number || undefined,
        address_complement: formData.address_complement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code.replace(/\D/g, "") || undefined,
        health_plan_id: formData.health_plan_id || undefined,
        health_plan_number: formData.health_plan_number || undefined,
        health_plan_type: formData.health_plan_type || undefined,
        medical_notes: formData.medical_notes || undefined,
      });
      setOriginalData(formData);
      showToast("Paciente atualizado com sucesso!", "success");
      if (returnUrl) {
        setTimeout(() => router.push(decodeURIComponent(returnUrl)), 800);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast("Erro ao salvar as alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && originalData) {
      setFormData(originalData);
    } else {
      router.push(returnUrl ? decodeURIComponent(returnUrl) : "/pacientes");
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Paciente não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const genderOptions = [
    { value: "", label: "Selecione" },
    { value: "M", label: "Masculino" },
    { value: "F", label: "Feminino" },
    { value: "O", label: "Outro" },
  ];

  const stateOptions = [
    { value: "", label: "Selecione" },
    { value: "AC", label: "Acre" },
    { value: "AL", label: "Alagoas" },
    { value: "AP", label: "Amapá" },
    { value: "AM", label: "Amazonas" },
    { value: "BA", label: "Bahia" },
    { value: "CE", label: "Ceará" },
    { value: "DF", label: "Distrito Federal" },
    { value: "ES", label: "Espírito Santo" },
    { value: "GO", label: "Goiás" },
    { value: "MA", label: "Maranhão" },
    { value: "MT", label: "Mato Grosso" },
    { value: "MS", label: "Mato Grosso do Sul" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PA", label: "Pará" },
    { value: "PB", label: "Paraíba" },
    { value: "PR", label: "Paraná" },
    { value: "PE", label: "Pernambuco" },
    { value: "PI", label: "Piauí" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "RN", label: "Rio Grande do Norte" },
    { value: "RS", label: "Rio Grande do Sul" },
    { value: "RO", label: "Rondônia" },
    { value: "RR", label: "Roraima" },
    { value: "SC", label: "Santa Catarina" },
    { value: "SP", label: "São Paulo" },
    { value: "SE", label: "Sergipe" },
    { value: "TO", label: "Tocantins" },
  ];

  const healthPlanOptions = [
    { value: "", label: "Selecione um convênio" },
    ...healthPlans.map((plan) => ({ value: plan.id, label: plan.name })),
  ];

  // Sidebar com histórico de cirurgias (mock)
  const surgeryHistory = [
    {
      id: "1",
      procedure: "Artroscopia de Joelho",
      date: "15/01/2026",
      status: "Realizada",
    },
    {
      id: "2",
      procedure: "Cirurgia de Menisco",
      date: "20/11/2025",
      status: "Realizada",
    },
    {
      id: "3",
      procedure: "Consulta Pré-operatória",
      date: "10/11/2025",
      status: "Realizada",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Histórico de cirurgias
        </h3>
      </div>

      {/* Lista de cirurgias */}
      <div className="flex-1 overflow-y-auto">
        {surgeryHistory.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900">
                {surgery.procedure}
              </span>
              <span className="text-xs text-gray-500">{surgery.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                {surgery.status}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Pacientes"
        backHref="/pacientes"
        itemName={patient.name}
        itemSubtitle="Paciente"
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações pessoais */}
        <FormSection title="Informações pessoais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome completo"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
            <Input
              label="CPF"
              value={formatCPF(formData.cpf)}
              onChange={(e) =>
                handleInputChange("cpf", e.target.value.replace(/\D/g, ""))
              }
              placeholder="000.000.000-00"
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange("birth_date", e.target.value)}
            />
            <Select
              label="Gênero"
              value={formData.gender}
              onChange={(e) => handleInputChange("gender", e.target.value)}
              options={genderOptions}
            />
            <Input
              label="Telefone"
              value={formatPhone(formData.phone)}
              onChange={(e) =>
                handleInputChange("phone", e.target.value.replace(/\D/g, ""))
              }
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
          </div>
        </FormSection>

        {/* Seção: Endereço */}
        <FormSection title="Endereço">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Logradouro"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua / Avenida / Travessa"
              />
            </div>
            <Input
              label="Número"
              value={formData.address_number}
              onChange={(e) =>
                handleInputChange("address_number", e.target.value)
              }
            />
            <Input
              label="Complemento"
              value={formData.address_complement}
              onChange={(e) =>
                handleInputChange("address_complement", e.target.value)
              }
            />
            <Input
              label="Bairro"
              value={formData.neighborhood}
              onChange={(e) =>
                handleInputChange("neighborhood", e.target.value)
              }
            />
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            />
            <Select
              label="Estado"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              options={stateOptions}
            />
            <Input
              label="CEP"
              value={formData.zip_code.replace(/^(\d{5})(\d)/, "$1-$2")}
              onChange={(e) =>
                handleInputChange("zip_code", e.target.value.replace(/\D/g, ""))
              }
              placeholder="00000-000"
            />
          </div>
        </FormSection>

        {/* Seção: Convênio */}
        <FormSection title="Convênio">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Convênio"
              value={formData.health_plan_id}
              onChange={(e) =>
                handleInputChange("health_plan_id", e.target.value)
              }
              options={healthPlanOptions}
            />
            <Input
              label="Número da carteirinha"
              value={formData.health_plan_number}
              onChange={(e) =>
                handleInputChange("health_plan_number", e.target.value)
              }
              placeholder="Número do convênio"
            />
          </div>
        </FormSection>

        {/* Botão de salvar */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
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
            Salvar alterações
          </Button>
        </div>
      </DetailPageLayout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as any}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}
