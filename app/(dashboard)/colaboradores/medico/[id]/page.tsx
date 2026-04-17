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
import { userService } from "@/services/user.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { formatPhone, formatTimeAgo } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight, Clock } from "lucide-react";
import { DoctorAccessSection } from "@/components/colaboradores/DoctorAccessSection";
import { CollaboratorActionsSection } from "@/components/colaboradores/CollaboratorActionsSection";

export default function MedicoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [collaboratorStatus, setCollaboratorStatus] = useState<
    string | undefined
  >(undefined);
  const [recentRequests, setRecentRequests] = useState<
    SurgeryRequestListItem[]
  >([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
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
      const doc = await collaboratorService.getDoctorById(params.id);

      if (!doc) {
        console.error("Médico não encontrado");
        setLoading(false);
        return;
      }

      setDoctor(doc);
      setCollaboratorStatus(doc.status);

      const dp = doc.doctor_profile;
      // Preenche o formulário
      const fd = {
        name: doc.name || "",
        email: doc.email || "",
        phone: doc.phone || "",
        specialty: dp?.specialty || "",
        crm: dp?.crm || "",
        crmState: dp?.crm_state || "",
        gender: doc.gender || "",
        birth_date: doc.birthDate || "",
        cpf: doc.document || "",
        cep: doc.cep || "",
        address: doc.address || "",
        address_number: doc.address_number || "",
        address_complement: doc.address_complement || "",
        city: doc.city || "",
        state: doc.state || "",
      };
      setFormData(fd);
      setOriginalData(fd);
    } catch (error) {
      console.error("Erro ao carregar médico:", error);
    } finally {
      setLoading(false);
    }

    // Carregar últimas solicitações do médico
    setLoadingRequests(true);
    try {
      const response = await surgeryRequestService.getAll();
      if (response?.records && Array.isArray(response.records)) {
        const doctorRequests = response.records
          .filter((r: any) => String(r.doctor_id) === String(params.id))
          .slice(0, 10);
        setRecentRequests(doctorRequests);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!doctor) return;

    setSaving(true);
    try {
      // 1. Salvar dados básicos do perfil
      await collaboratorService.updateProfile(doctor.id, {
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

      // 2. Salvar dados profissionais (CRM, specialty, crm_state)
      if (doctor.doctor_profile?.id) {
        await userService.updateDoctorProfile(doctor.doctor_profile.id, {
          crm: formData.crm || undefined,
          crm_state: formData.crmState || undefined,
          specialty: formData.specialty || undefined,
        });
      }

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
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Últimas solicitações
        </h3>
        {!loadingRequests && (
          <span className="text-xs text-gray-400">{recentRequests.length}</span>
        )}
      </div>

      {/* Lista de solicitações */}
      <div className="flex-1 overflow-y-auto">
        {loadingRequests ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-gray-400">
              Nenhuma solicitação encontrada
            </span>
          </div>
        ) : (
          recentRequests.map((req) => {
            const statusLabel =
              STATUS_NUMBER_TO_STRING[req.status] ?? "Pendente";
            const colors = STATUS_COLORS[statusLabel] ?? {
              bg: "bg-gray-50",
              text: "text-gray-600",
            };
            const patientName = req.patient?.name || "Paciente";
            const procedureName =
              (req as any).procedure_name ||
              (req as any).indication_name ||
              req.procedure?.name ||
              req.tuss_procedure?.description ||
              "Procedimento";
            return (
              <div
                key={req.id}
                onClick={() => router.push(`/solicitacao/${req.id}`)}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {patientName}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {procedureName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Colaboradores"
        backHref="/colaboradores"
        itemName={formData.name}
        itemSubtitle={formData.specialty || "Médico"}
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
            <div className="sm:col-span-2">
              <Select
                label="Especialidade"
                value={formData.specialty}
                onChange={(e) => handleInputChange("specialty", e.target.value)}
                options={specialtyOptions}
              />
            </div>
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

        {/* Seção: Horários de trabalho — Em breve */}
        <FormSection title="Consultório/Ambulatório">
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
            <Clock className="w-8 h-8 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-500">Em breve</p>
            <p className="text-xs text-gray-400 mt-1">
              O gerenciamento de horários e locais de atendimento estará
              disponível em uma próxima atualização.
            </p>
          </div>
        </FormSection>

        {/* Seção: Acesso a Outros Médicos */}
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
