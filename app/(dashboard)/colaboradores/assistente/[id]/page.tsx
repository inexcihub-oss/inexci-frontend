"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import {
  collaboratorService,
  Collaborator,
} from "@/services/collaborator.service";
import { formatPhone } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

export default function AssistenteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    gender: "",
    birthDate: "",
    country: "Brasil",
    city: "",
    role: "editor" as "admin" | "editor" | "viewer",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const collab = await collaboratorService.getById(params.id);

      if (!collab) {
        console.error("Colaborador não encontrado");
        setLoading(false);
        return;
      }

      setCollaborator(collab);

      // Preenche o formulário
      setFormData({
        name: collab.name || "",
        email: collab.email || "",
        phone: collab.phone || "",
        specialty: collab.specialty || "",
        gender: collab.gender || "",
        birthDate: collab.birthDate || "",
        country: "Brasil",
        city: "",
        role: collab.role || "editor",
      });
    } catch (error) {
      console.error("Erro ao carregar colaborador:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!collaborator) return;

    setSaving(true);
    try {
      await collaboratorService.update(collaborator.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialty: formData.specialty,
        role: formData.role,
      });
      alert("Assistente atualizado com sucesso!");
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

  if (!collaborator) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Assistente não encontrado.</p>
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
  ];

  const roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "editor", label: "Editor" },
    { value: "viewer", label: "Visualizador" },
  ];

  // Sidebar com últimos pacientes (mock)
  const recentPatients = [
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
      procedure: "Cirurgias de menisco",
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
      procedure: "Cirurgias de menisco",
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
          Últimos pacientes
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
              <span className="text-xs text-gray-400">{patient.time}</span>
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
        itemName={collaborator.name}
        itemSubtitle={formData.specialty || "Assistente"}
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
              value={formData.birthDate}
              onChange={(e) => handleInputChange("birthDate", e.target.value)}
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
            <Select
              label="Função"
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value as any)}
              options={roleOptions}
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
                  <td className="py-3">Terça-feira</td>
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
                  <td className="py-3">Quinta-feira</td>
                  <td className="py-3">08:00 - 18:00</td>
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
                  <td className="py-3">10:00 - 15:00</td>
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
