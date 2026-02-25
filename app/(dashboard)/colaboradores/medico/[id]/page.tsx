"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { collaboratorService, Doctor } from "@/services/collaborator.service";
import { formatPhone } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ChevronRight } from "lucide-react";

export default function MedicoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    crm: "",
    crmState: "",
    gender: "",
    birth_date: "",
    cpf: "",
    country: "Brasil",
    city: "",
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
      const doc = await collaboratorService.getDoctorById(params.id);

      if (!doc) {
        console.error("Médico não encontrado");
        setLoading(false);
        return;
      }

      setDoctor(doc);

      // Preenche o formulário
      setFormData({
        name: doc.name || "",
        email: doc.email || "",
        phone: doc.phone || "",
        specialty: doc.specialty || "",
        crm: doc.crm || "",
        crmState: doc.crmState || "",
        gender: doc.gender || "",
        birth_date: doc.birthDate || "",
        cpf: doc.document || "",
        country: "Brasil",
        city: "",
      });
      setOriginalData({
        name: doc.name || "",
        email: doc.email || "",
        phone: doc.phone || "",
        specialty: doc.specialty || "",
        crm: doc.crm || "",
        crmState: doc.crmState || "",
        gender: doc.gender || "",
        birth_date: doc.birthDate || "",
        cpf: doc.document || "",
        country: "Brasil",
        city: "",
      });
    } catch (error) {
      console.error("Erro ao carregar médico:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!doctor) return;

    setSaving(true);
    try {
      await collaboratorService.updateProfile(doctor.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialty: formData.specialty,
        gender: formData.gender,
        birth_date: formData.birth_date || undefined,
        cpf: formData.cpf || undefined,
      });
      setOriginalData(formData);
      showToast("Médico atualizado com sucesso!", "success");
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
      router.push("/colaboradores");
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

  if (!doctor) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Médico não encontrado.</p>
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

  const specialtyOptions = [
    { value: "", label: "Selecione" },
    { value: "ortopedia", label: "Ortopedia" },
    { value: "cardiologia", label: "Cardiologia" },
    { value: "neurologia", label: "Neurologia" },
    { value: "cirurgia-geral", label: "Cirurgia Geral" },
    { value: "anestesiologia", label: "Anestesiologia" },
    { value: "ginecologia", label: "Ginecologia e Obstetrícia" },
    { value: "urologia", label: "Urologia" },
    { value: "oftalmologia", label: "Oftalmologia" },
    { value: "otorrinolaringologia", label: "Otorrinolaringologia" },
    { value: "pediatria", label: "Pediatria" },
  ];

  const crmStateOptions = [
    { value: "", label: "UF" },
    { value: "AC", label: "AC" },
    { value: "AL", label: "AL" },
    { value: "AM", label: "AM" },
    { value: "AP", label: "AP" },
    { value: "BA", label: "BA" },
    { value: "CE", label: "CE" },
    { value: "DF", label: "DF" },
    { value: "ES", label: "ES" },
    { value: "GO", label: "GO" },
    { value: "MA", label: "MA" },
    { value: "MG", label: "MG" },
    { value: "MS", label: "MS" },
    { value: "MT", label: "MT" },
    { value: "PA", label: "PA" },
    { value: "PB", label: "PB" },
    { value: "PE", label: "PE" },
    { value: "PI", label: "PI" },
    { value: "PR", label: "PR" },
    { value: "RJ", label: "RJ" },
    { value: "RN", label: "RN" },
    { value: "RO", label: "RO" },
    { value: "RR", label: "RR" },
    { value: "RS", label: "RS" },
    { value: "SC", label: "SC" },
    { value: "SE", label: "SE" },
    { value: "SP", label: "SP" },
    { value: "TO", label: "TO" },
  ];

  // Sidebar com últimas solicitações (mock)
  const recentRequests = [
    {
      id: "1",
      name: "Amanda Rodrigues",
      procedure: "Artroscopia de Joelho",
      time: "1 dia atrás",
    },
    {
      id: "2",
      name: "Clarissa Neves",
      procedure: "Reconstrução do LCA",
      time: "12 dias atrás",
    },
    {
      id: "3",
      name: "David Souza",
      procedure: "Cirurgia de menisco",
      time: "2 semanas atrás",
    },
    {
      id: "4",
      name: "Henrique Lopes",
      procedure: "Artroscopia de Joelho",
      time: "1 mês atrás",
    },
    {
      id: "5",
      name: "Suzane Oliveira",
      procedure: "Cirurgia de menisco",
      time: "2 meses atrás",
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
      <div className="flex items-center px-6 py-0 border-b border-neutral-100 h-13">
        <h3 className="text-sm font-semibold text-gray-900">
          Últimas solicitações
        </h3>
      </div>

      {/* Lista de solicitações */}
      <div className="flex-1 overflow-y-auto">
        {recentRequests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(req.id)}`}
              >
                {getInitials(req.name)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900">
                  {req.name}
                </span>
                <span className="text-xs text-gray-500">{req.procedure}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{req.time}</span>
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
        itemName={doctor.name}
        itemSubtitle={formData.specialty || "Médico"}
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações pessoais */}
        <FormSection title="Informações pessoais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome completo"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            <Select
              label="Gênero"
              value={formData.gender}
              onChange={(e) => handleInputChange("gender", e.target.value)}
              options={genderOptions}
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange("birth_date", e.target.value)}
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
              label="País"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
            />
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            <Select
              label="Especialidade"
              value={formData.specialty}
              onChange={(e) => handleInputChange("specialty", e.target.value)}
              options={specialtyOptions}
            />
          </div>
        </FormSection>

        {/* Seção: Dados profissionais */}
        <FormSection title="Dados profissionais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="CRM"
              value={formData.crm}
              onChange={(e) => handleInputChange("crm", e.target.value)}
              placeholder="000000"
            />
            <Select
              label="Estado do CRM"
              value={formData.crmState}
              onChange={(e) => handleInputChange("crmState", e.target.value)}
              options={crmStateOptions}
            />
          </div>
        </FormSection>

        {/* Seção: Horários de trabalho */}
        <FormSection title="Consultório/Ambulatório">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-3 font-normal">Dia da semana</th>
                  <th className="pb-3 font-normal">Horário</th>
                  <th className="pb-3 font-normal">Local</th>
                  <th className="pb-3 font-normal w-10"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-t border-gray-100">
                  <td className="py-3">Segunda-feira</td>
                  <td className="py-3">08:00 - 18:00</td>
                  <td className="py-3">Hospital A</td>
                  <td className="py-3">
                    <button className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-3">Quarta-feira</td>
                  <td className="py-3">08:00 - 15:00</td>
                  <td className="py-3">Hospital B</td>
                  <td className="py-3">
                    <button className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-3">Sexta-feira</td>
                  <td className="py-3">08:00 - 18:00</td>
                  <td className="py-3">Clínica A</td>
                  <td className="py-3">
                    <button className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                        <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FormSection>

        {/* Botão de salvar */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={!isDirty}>
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
