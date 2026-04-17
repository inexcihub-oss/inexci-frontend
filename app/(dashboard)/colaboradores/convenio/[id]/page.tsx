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
import {
  surgeryRequestService,
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight } from "lucide-react";

export default function ConvenioDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthPlan, setHealthPlan] = useState<HealthPlan | null>(null);
  const [surgeryRequests, setSurgeryRequests] = useState<
    SurgeryRequestListItem[]
  >([]);
  const [loadingSurgeries, setLoadingSurgeries] = useState(true);
  const { toast, showToast, hideToast } = useToast();

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
      setOriginalData({
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
      // Buscar solicitações cirúrgicas deste convênio
      setLoadingSurgeries(true);
      try {
        const surgeryData = await surgeryRequestService.getAll();
        const filtered = (surgeryData.records ?? []).filter(
          (r: any) =>
            String(r.health_plan_id) === String(healthPlanData.id) ||
            String(r.health_plan?.id) === String(healthPlanData.id),
        );
        setSurgeryRequests(filtered);
      } catch {
        setSurgeryRequests([]);
      } finally {
        setLoadingSurgeries(false);
      }
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
      setOriginalData(formData);
      showToast("Convênio atualizado com sucesso!", "success");
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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Solicitações recentes
        </h3>
        {!loadingSurgeries && (
          <span className="text-xs text-gray-400">
            {surgeryRequests.length}
          </span>
        )}
      </div>

      {/* Lista de solicitações */}
      <div className="flex-1 overflow-y-auto">
        {loadingSurgeries ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : surgeryRequests.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-400">
              Nenhuma solicitação encontrada.
            </p>
          </div>
        ) : (
          surgeryRequests.map((surgery) => {
            const statusLabel =
              STATUS_NUMBER_TO_STRING[surgery.status] ?? "Pendente";
            const colors = STATUS_COLORS[statusLabel] ?? {
              bg: "bg-gray-50",
              text: "text-gray-600",
            };
            const patientName =
              surgery.patient?.name || "Paciente não informado";
            const procedureName =
              (surgery as any).procedure_name ||
              surgery.procedure?.name ||
              surgery.tuss_procedure?.description ||
              "Procedimento não especificado";
            return (
              <div
                key={surgery.id}
                onClick={() => router.push(`/solicitacao/${surgery.id}`)}
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
        sectionTitle="Convênios"
        backHref="/convenios"
        itemName={formData.name}
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
              value={formData.zipCode.replace(/^(\d{5})(\d)/, "$1-$2")}
              onChange={(e) =>
                handleInputChange("zipCode", e.target.value.replace(/\D/g, ""))
              }
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
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}
