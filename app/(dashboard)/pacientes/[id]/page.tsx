"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { patientService, Patient } from "@/services/patient.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { formatCPF, formatPhone } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

export default function PacienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    healthPlanId: "",
    healthPlanNumber: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientData, allPatientsData, healthPlansData] = await Promise.all(
        [
          patientService.getById(params.id),
          patientService.getAll(),
          healthPlanService.getAll(),
        ],
      );

      if (!patientData) {
        console.error("Paciente não encontrado");
        setLoading(false);
        return;
      }

      setPatient(patientData);
      setAllPatients(allPatientsData);
      setHealthPlans(healthPlansData);

      // Encontra o índice atual
      const idx = allPatientsData.findIndex(
        (p) => String(p.id) === String(params.id),
      );
      setCurrentIndex(idx + 1);

      // Preenche o formulário
      setFormData({
        name: patientData.name || "",
        cpf: patientData.cpf || "",
        email: patientData.email || "",
        phone: patientData.phone || "",
        dateOfBirth: patientData.dateOfBirth || "",
        gender: patientData.gender || "",
        address: patientData.address || "",
        city: "",
        state: "",
        zipCode: "",
        healthPlanId: patientData.healthPlanId || "",
        healthPlanNumber: "",
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
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        healthPlanId: formData.healthPlanId,
      });
      alert("Paciente atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? currentIndex - 2 : currentIndex;
    if (newIndex >= 0 && newIndex < allPatients.length) {
      router.push(`/pacientes/${allPatients[newIndex].id}`);
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Histórico de cirurgias
        </h3>
        <button className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-[#DCDFE3] rounded shadow-sm">
          Ver todos
        </button>
      </div>

      {/* Lista de cirurgias */}
      <div className="flex-1 overflow-y-auto">
        {surgeryHistory.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900">
                {surgery.procedure}
              </span>
              <span className="text-xs text-gray-500">{surgery.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
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
        navigation={{
          currentIndex,
          totalItems: allPatients.length,
          onPrevious: () => handleNavigate("prev"),
          onNext: () => handleNavigate("next"),
        }}
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
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
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
                label="Endereço completo"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>
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
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              placeholder="00000-000"
            />
          </div>
        </FormSection>

        {/* Seção: Convênio */}
        <FormSection title="Convênio">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Convênio"
              value={formData.healthPlanId}
              onChange={(e) =>
                handleInputChange("healthPlanId", e.target.value)
              }
              options={healthPlanOptions}
            />
            <Input
              label="Número da carteirinha"
              value={formData.healthPlanNumber}
              onChange={(e) =>
                handleInputChange("healthPlanNumber", e.target.value)
              }
              placeholder="Número do convênio"
            />
          </div>
        </FormSection>

        {/* Botão de salvar */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push("/pacientes")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            Salvar alterações
          </Button>
        </div>
      </DetailPageLayout>
    </PageContainer>
  );
}
