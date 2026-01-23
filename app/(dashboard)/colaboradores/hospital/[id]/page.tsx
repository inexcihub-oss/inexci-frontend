"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

export default function HospitalDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    neighborhood: "",
    type: "",
    contact: "",
    contactPhone: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hospitalData, allHospitalsData] = await Promise.all([
        hospitalService.getById(params.id),
        hospitalService.getAll(),
      ]);

      if (!hospitalData) {
        console.error("Hospital não encontrado");
        setLoading(false);
        return;
      }

      setHospital(hospitalData);
      setAllHospitals(allHospitalsData);

      // Encontra o índice atual
      const idx = allHospitalsData.findIndex(
        (h) => String(h.id) === String(params.id),
      );
      setCurrentIndex(idx + 1);

      // Preenche o formulário
      setFormData({
        name: hospitalData.name || "",
        cnpj: hospitalData.cnpj || "",
        email: hospitalData.email || "",
        phone: hospitalData.phone || "",
        address: hospitalData.address || "",
        city: "",
        state: "",
        zipCode: "",
        neighborhood: "",
        type: "",
        contact: "",
        contactPhone: "",
      });
    } catch (error) {
      console.error("Erro ao carregar hospital:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!hospital) return;

    setSaving(true);
    try {
      await hospitalService.update(hospital.id, {
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });
      alert("Hospital atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? currentIndex - 2 : currentIndex;
    if (newIndex >= 0 && newIndex < allHospitals.length) {
      router.push(`/colaboradores/hospital/${allHospitals[newIndex].id}`);
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

  if (!hospital) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Hospital não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const hospitalTypeOptions = [
    { value: "", label: "Selecione" },
    { value: "publico", label: "Público" },
    { value: "privado", label: "Privado" },
    { value: "filantrópico", label: "Filantrópico" },
    { value: "universitário", label: "Universitário" },
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

  // Sidebar com cirurgias recentes (mock)
  const recentSurgeries = [
    {
      id: "1",
      procedure: "Artroscopia de Joelho",
      date: "15/01/2026",
      doctor: "Dr. Carlos Silva",
    },
    {
      id: "2",
      procedure: "Cirurgia de Menisco",
      date: "14/01/2026",
      doctor: "Dra. Ana Costa",
    },
    {
      id: "3",
      procedure: "Prótese de Quadril",
      date: "12/01/2026",
      doctor: "Dr. Carlos Silva",
    },
    {
      id: "4",
      procedure: "Artrodese Lombar",
      date: "10/01/2026",
      doctor: "Dr. João Santos",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Cirurgias recentes
        </h3>
        <button className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-[#DCDFE3] rounded shadow-sm">
          Ver todas
        </button>
      </div>

      {/* Lista de cirurgias */}
      <div className="flex-1 overflow-y-auto">
        {recentSurgeries.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900">
                {surgery.procedure}
              </span>
              <span className="text-xs text-gray-500">{surgery.doctor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{surgery.date}</span>
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
        itemName={hospital.name}
        itemSubtitle="Hospital"
        navigation={{
          currentIndex,
          totalItems: allHospitals.length,
          onPrevious: () => handleNavigate("prev"),
          onNext: () => handleNavigate("next"),
        }}
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações gerais */}
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do hospital"
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
            <Select
              label="Tipo de hospital"
              value={formData.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              options={hospitalTypeOptions}
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
