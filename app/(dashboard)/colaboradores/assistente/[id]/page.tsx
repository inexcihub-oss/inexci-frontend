"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import {
  collaboratorService,
  Collaborator,
} from "@/services/collaborator.service";
import { userService } from "@/services/user.service";
import { uploadService } from "@/services/upload.service";
import { patientService, Patient } from "@/services/patient.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { formatPhone, formatTimeAgo } from "@/lib/formatters";
import { removeBackground, cn } from "@/lib/utils";
import { GENDER_OPTIONS, STATE_UF_OPTIONS } from "@/lib/options";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight, Upload, X, FileSignature, Loader2 } from "lucide-react";
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
  const [recentRequests, setRecentRequests] = useState<
    SurgeryRequestListItem[]
  >([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureDeleted, setSignatureDeleted] = useState(false);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  const isDoctor = collaborator?.is_doctor === true;

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
    // Doctor-specific fields
    specialty: "",
    crm: "",
    crmState: "",
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

      const dp = collab.doctor_profile;

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
        // Doctor-specific
        specialty: dp?.specialty || "",
        crm: dp?.crm || "",
        crmState: dp?.crm_state || "",
      };
      setFormData(fd);
      setOriginalData(fd);

      // Carregar assinatura do médico
      if (dp?.signature_url) {
        try {
          const signedUrl = await uploadService.getSignedUrl(dp.signature_url);
          setSignaturePreview(signedUrl);
        } catch {
          // ignora erro ao carregar assinatura
        }
      }
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

    // Carregar últimas solicitações (para médicos)
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

      // Se for médico, salvar dados profissionais
      if (isDoctor && collaborator.doctor_profile?.id) {
        await userService.updateDoctorProfile(collaborator.id, {
          crm: formData.crm || undefined,
          crm_state: formData.crmState || undefined,
          specialty: formData.specialty || undefined,
        });
      }

      setOriginalData(formData);
      showToast("Colaborador atualizado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast("Erro ao salvar as alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignature = async () => {
    if (!collaborator?.id) return;
    setSaving(true);
    try {
      let signaturePath: string | undefined = undefined;
      if (signatureFile) {
        const sigResult = await uploadService.uploadSingle(
          signatureFile,
          "signatures",
        );
        signaturePath = sigResult.data.path;
      }
      await userService.updateDoctorProfile(collaborator.id, {
        ...(signatureFile
          ? { signature_image_url: signaturePath }
          : signatureDeleted
            ? { signature_image_url: null }
            : {}),
      });
      setSignatureFile(null);
      setSignatureDeleted(false);
      showToast("Assinatura salva com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      showToast("Erro ao salvar a assinatura.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > 2 * 1024 * 1024) {
      showToast("A assinatura deve ter no máximo 2MB", "error");
      return;
    }
    setIsProcessingSignature(true);
    try {
      const processed = await removeBackground(rawFile);
      setSignatureFile(processed);
      setSignatureDeleted(false);
      const reader = new FileReader();
      reader.onloadend = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(processed);
    } catch {
      showToast("Erro ao processar imagem da assinatura", "error");
    } finally {
      setIsProcessingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  const handleDeleteSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    setSignatureDeleted(true);
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
          <p className="text-gray-500">Colaborador não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

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

  const sidebarContent = isDoctor ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Últimas solicitações
        </h3>
        {!loadingRequests && (
          <span className="text-xs text-gray-400">{recentRequests.length}</span>
        )}
      </div>
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
  ) : (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Últimos pacientes
        </h3>
        {!loadingPatients && (
          <span className="text-xs text-gray-400">{recentPatients.length}</span>
        )}
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
              onClick={() => router.push(`/pacientes/${patient.id}`)}
              className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
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
        itemName={formData.name}
        itemSubtitle={isDoctor ? formData.specialty || "Médico" : "Colaborador"}
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
              options={GENDER_OPTIONS}
            />
            <DateInput
              label="Data de nascimento"
              value={formData.birth_date}
              onChange={(v) => handleInputChange("birth_date", v)}
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
          {!isDoctor && (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                isLoading={saving}
                disabled={!isDirty}
              >
                Salvar alterações
              </Button>
            </div>
          )}
        </FormSection>

        {/* Seção: Dados profissionais (somente médicos) */}
        {isDoctor && (
          <FormSection title="Dados profissionais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Especialidade"
                  value={formData.specialty}
                  onChange={(e) =>
                    handleInputChange("specialty", e.target.value)
                  }
                  placeholder="Ex: Ortopedia, Cardiologia..."
                />
              </div>
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
                options={STATE_UF_OPTIONS}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                isLoading={saving}
                disabled={!isDirty}
              >
                Salvar alterações
              </Button>
            </div>
          </FormSection>
        )}

        {/* Seção: Assinatura do Médico (somente médicos) */}
        {isDoctor && (
          <FormSection title="Assinatura do Médico">
            <p className="text-sm text-gray-500 mb-4">
              Faça upload da assinatura do médico para documentos e laudos.
            </p>
            {isProcessingSignature ? (
              <div className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <p className="text-sm text-gray-500">
                  Processando assinatura...
                </p>
              </div>
            ) : (
              <div
                onClick={() =>
                  !isProcessingSignature && signatureInputRef.current?.click()
                }
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  signaturePreview
                    ? "border-primary-300 bg-primary-50"
                    : "border-gray-300 hover:border-primary-400 hover:bg-gray-50",
                )}
              >
                {signaturePreview ? (
                  <div className="relative">
                    <Image
                      src={signaturePreview}
                      alt="Assinatura"
                      width={300}
                      height={100}
                      className="mx-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSignature();
                      }}
                      className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      Clique para fazer upload da assinatura
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG ou JPG. O fundo será removido automaticamente. Máximo
                      2MB.
                    </p>
                  </>
                )}
              </div>
            )}
            {(signatureFile || signatureDeleted) && !isProcessingSignature && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <span>⚠</span>{" "}
                  {signatureDeleted
                    ? "Remoção pendente — salve para confirmar."
                    : "Assinatura ainda não salva — salve para confirmar."}
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSignature}
                    isLoading={saving}
                  >
                    Salvar assinatura
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignatureChange}
              className="hidden"
            />
          </FormSection>
        )}

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
