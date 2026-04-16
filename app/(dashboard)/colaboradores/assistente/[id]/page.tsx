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
import { patientService, Patient } from "@/services/patient.service";
import { formatPhone, formatTimeAgo } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight } from "lucide-react";
import { DoctorAccessSection } from "@/components/colaboradores/DoctorAccessSection";
import { CollaboratorActionsSection } from "@/components/colaboradores/CollaboratorActionsSection";

export default function AssistenteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [collaboratorStatus, setCollaboratorStatus] = useState<
    string | undefined
  >(undefined);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    birth_date: "",
    cpf: "",
    cep: "",
    address: "",
    address_number: "",
    address_complement: "",
    city: "",
    state: "",
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
      const collab = await collaboratorService.getById(params.id);

      if (!collab) {
        console.error("Colaborador não encontrado");
        setLoading(false);
        return;
      }

      setCollaborator(collab);
      setCollaboratorStatus(collab.status);

      // Preenche o formulário
      const fd = {
        name: collab.name || "",
        email: collab.email || "",
        phone: collab.phone || "",
        gender: collab.gender || "",
        birth_date: collab.birthDate || "",
        cpf: collab.document || "",
        cep: collab.cep || "",
        address: collab.address || "",
        address_number: collab.address_number || "",
        address_complement: collab.address_complement || "",
        city: collab.city || "",
        state: collab.state || "",
      };
      setFormData(fd);
      setOriginalData(fd);
    } catch (error) {
      console.error("Erro ao carregar colaborador:", error);
    } finally {
      setLoading(false);
    }

    // Carregar últimos pacientes
    setLoadingPatients(true);
    try {
      const patients = await patientService.getAll();
      // Ordenar por mais recente e pegar os 5 primeiros
      const sorted = [...patients]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5);
      setRecentPatients(sorted);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!collaborator) return;

    setSaving(true);
    try {
      await collaboratorService.updateProfile(collaborator.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birth_date: formData.birth_date || undefined,
        cpf: formData.cpf || undefined,
        cep: formData.cep || undefined,
        address: formData.address || undefined,
        address_number: formData.address_number || undefined,
        address_complement: formData.address_complement || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
      });
      setOriginalData(formData);
      showToast("Assistente atualizado com sucesso!", "success");
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
        {loadingPatients ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : recentPatients.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-gray-400">
              Nenhum paciente encontrado
            </span>
          </div>
        ) : (
          recentPatients.map((patient) => (
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
                    {patient.email || patient.phone || ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(patient.createdAt)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Colaboradores"
        backHref="/colaboradores"
        itemName={collaborator.name}
        itemSubtitle="Colaborador"
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações pessoais */}
        <FormSection title="Informações pessoais">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <Input
              label="Nome completo"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
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
              label="CPF"
              value={formData.cpf}
              onChange={(e) => handleInputChange("cpf", e.target.value)}
              placeholder="000.000.000-00"
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
              label="Endereço"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Rua, Avenida..."
            />
            <Input
              label="CEP"
              value={formData.cep}
              onChange={(e) => handleInputChange("cep", e.target.value)}
              placeholder="00000-000"
            />
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
              placeholder="Apto, sala..."
            />
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            />
            <Input
              label="Estado"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder="UF"
            />
          </div>
          {/* Botões dentro da seção */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={saving} disabled={!isDirty}>
              Salvar alterações
            </Button>
          </div>
        </FormSection>

        {/* Seção: Acesso a Médicos */}
        <DoctorAccessSection collaboratorId={params.id} />

        {/* Seção: Acesso e Segurança */}
        <CollaboratorActionsSection
          collaboratorId={params.id}
          currentStatus={collaboratorStatus}
          onStatusChange={setCollaboratorStatus}
        />
      </DetailPageLayout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}
