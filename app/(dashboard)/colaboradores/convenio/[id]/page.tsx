"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

export default function ConvenioDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthPlan, setHealthPlan] = useState<HealthPlan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    website: "",
    type: "",
    ansRegistry: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    contact: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const healthPlanData = await healthPlanService.getById(params.id);

      if (!healthPlanData) {
        console.error("Convênio não encontrado");
        setLoading(false);
        return;
      }

      setHealthPlan(healthPlanData);

      // Preenche o formulário
      setFormData({
        name: healthPlanData.name || "",
        cnpj: healthPlanData.cnpj || "",
        email: healthPlanData.email || "",
        phone: healthPlanData.phone || "",
        website: "",
        type: "",
        ansRegistry: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        contact: "",
        contactPhone: "",
        contactEmail: "",
      });
    } catch (error) {
      console.error("Erro ao carregar convênio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!healthPlan) return;

    setSaving(true);
    try {
      await healthPlanService.update(healthPlan.id, {
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
      });
      alert("Convênio atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as alterações.");
    } finally {
      setSaving(false);
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

  if (!healthPlan) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Convênio não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const planTypeOptions = [
    { value: "", label: "Selecione" },
    { value: "individual", label: "Individual" },
    { value: "familiar", label: "Familiar" },
    { value: "empresarial", label: "Empresarial" },
    { value: "coletivo", label: "Coletivo por Adesão" },
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

  // Sidebar com pacientes do convênio (mock)
  const recentPatients = [
    {
      id: "1",
      name: "Amanda Rodrigues",
      procedure: "Artroscopia de Joelho",
      date: "15/01/2026",
    },
    {
      id: "2",
      name: "Carlos Mendes",
      procedure: "Prótese de Quadril",
      date: "12/01/2026",
    },
    {
      id: "3",
      name: "Fernanda Lima",
      procedure: "Cirurgia de Menisco",
      date: "10/01/2026",
    },
    {
      id: "4",
      name: "João Santos",
      procedure: "Artrodese Lombar",
      date: "08/01/2026",
    },
  ];

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      "bg-blue-200",
      "bg-green-200",
      "bg-yellow-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Pacientes recentes
        </h3>
      </div>

      {/* Lista de pacientes */}
      <div className="flex-1 overflow-y-auto">
        {recentPatients.map((patient) => (
          <div
            key={patient.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(patient.id)}`}
              >
                {getInitials(patient.name)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900">
                  {patient.name}
                </span>
                <span className="text-xs text-gray-500">
                  {patient.procedure}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{patient.date}</span>
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
        sectionTitle="Colaboradores"
        backHref="/colaboradores"
        itemName={healthPlan.name}
        itemSubtitle="Convênio"
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações gerais */}
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do convênio"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
            <Input
              label="CNPJ"
              value={formatCNPJ(formData.cnpj)}
              onChange={(e) =>
                handleInputChange("cnpj", e.target.value.replace(/\D/g, ""))
              }
              placeholder="00.000.000/0000-00"
            />
            <Input
              label="Registro ANS"
              value={formData.ansRegistry}
              onChange={(e) => handleInputChange("ansRegistry", e.target.value)}
              placeholder="Número de registro na ANS"
            />
            <Select
              label="Tipo de plano"
              value={formData.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              options={planTypeOptions}
            />
            <Input
              label="Telefone principal"
              value={formatPhone(formData.phone)}
              onChange={(e) =>
                handleInputChange("phone", e.target.value.replace(/\D/g, ""))
              }
              placeholder="(00) 0000-0000"
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              placeholder="https://www.exemplo.com.br"
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

        {/* Seção: Contato */}
        <FormSection title="Contato responsável">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do contato"
              value={formData.contact}
              onChange={(e) => handleInputChange("contact", e.target.value)}
              placeholder="Nome do responsável"
            />
            <Input
              label="Telefone do contato"
              value={formData.contactPhone}
              onChange={(e) =>
                handleInputChange("contactPhone", e.target.value)
              }
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail do contato"
              type="email"
              value={formData.contactEmail}
              onChange={(e) =>
                handleInputChange("contactEmail", e.target.value)
              }
            />
          </div>
        </FormSection>

        {/* Botão de salvar */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/colaboradores")}
          >
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
