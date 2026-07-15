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
import { logger } from "@/lib/logger";
import { maskCep, maskCnpj, maskPhone, unmask } from "@/lib/masks";
import { STATE_OPTIONS } from "@/lib/options";
import { useToast } from "@/hooks/useToast";
import { useCepLookup } from "@/hooks/useCepLookup";
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
    ansRegistry: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
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

  const { loading: cepLoading } = useCepLookup({
    cep: formData.zipCode,
    enabled: !loading,
    onResolved: (data) => {
      setFormData((prev) => ({
        ...prev,
        address: data.logradouro,
        city: data.cidade,
        state: data.uf,
      }));
    },
    onError: (err) => {
      if (err.code === "not_found") {
        showToast("CEP não encontrado.", "error");
        return;
      }
      if (err.code === "invalid") {
        showToast("CEP inválido.", "error");
        return;
      }
      showToast("Não foi possível consultar o CEP.", "error");
    },
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    // Disparada em paralelo com o getById abaixo (não depende de
    // healthPlanData — o filtro por convênio é feito em memória).
    // `.catch(noop)` evita unhandled rejection em retorno antecipado.
    const surgeryPromise = surgeryRequestService.getAll();
    surgeryPromise.catch(() => {});
    try {
      const healthPlanData = await healthPlanService.getById(params.id);

      if (!healthPlanData) {
        logger.error("Convênio não encontrado");
        setLoading(false);
        return;
      }

      setHealthPlan(healthPlanData);

      // Preenche o formulário
      setFormData({
        name: healthPlanData.name || "",
        cnpj: maskCnpj(healthPlanData.cnpj || ""),
        email: healthPlanData.email || "",
        phone: maskPhone(healthPlanData.phone || ""),
        website: healthPlanData.website || "",
        ansRegistry: healthPlanData.ansCode || "",
        address: healthPlanData.address || "",
        addressNumber: healthPlanData.addressNumber || "",
        addressComplement: healthPlanData.addressComplement || "",
        city: healthPlanData.city || "",
        state: healthPlanData.state || "",
        zipCode: maskCep(healthPlanData.zipCode || ""),
        contact: healthPlanData.authorizationContact || "",
        contactPhone: maskPhone(healthPlanData.authorizationPhone || ""),
        contactEmail: healthPlanData.authorizationEmail || "",
      });
      setOriginalData({
        name: healthPlanData.name || "",
        cnpj: maskCnpj(healthPlanData.cnpj || ""),
        email: healthPlanData.email || "",
        phone: maskPhone(healthPlanData.phone || ""),
        website: healthPlanData.website || "",
        ansRegistry: healthPlanData.ansCode || "",
        address: healthPlanData.address || "",
        addressNumber: healthPlanData.addressNumber || "",
        addressComplement: healthPlanData.addressComplement || "",
        city: healthPlanData.city || "",
        state: healthPlanData.state || "",
        zipCode: maskCep(healthPlanData.zipCode || ""),
        contact: healthPlanData.authorizationContact || "",
        contactPhone: maskPhone(healthPlanData.authorizationPhone || ""),
        contactEmail: healthPlanData.authorizationEmail || "",
      });
      // Buscar solicitações cirúrgicas deste convênio
      setLoadingSurgeries(true);
      try {
        const surgeryData = await surgeryPromise;
        const filtered = (surgeryData.records ?? []).filter(
          (r: any) =>
            String(r.healthPlanId) === String(healthPlanData.id) ||
            String(r.health_plan?.id) === String(healthPlanData.id),
        );
        setSurgeryRequests(filtered);
      } catch {
        setSurgeryRequests([]);
      } finally {
        setLoadingSurgeries(false);
      }
    } catch (error) {
      logger.error("Erro ao carregar convênio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!healthPlan) return;

    const name = formData.name.trim();
    if (!name) {
      showToast("Nome do convênio é obrigatório.", "error");
      return;
    }

    setSaving(true);
    try {
      const normalizedFormData = { ...formData, name };
      await healthPlanService.update(healthPlan.id, {
        name,
        cnpj: unmask(formData.cnpj) || undefined,
        email: formData.email || undefined,
        phone: unmask(formData.phone) || undefined,
        ansCode: formData.ansRegistry || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        addressNumber: formData.addressNumber || undefined,
        addressComplement: formData.addressComplement || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: unmask(formData.zipCode) || undefined,
        authorizationContact: formData.contact || undefined,
        authorizationPhone: unmask(formData.contactPhone) || undefined,
        authorizationEmail: formData.contactEmail || undefined,
      });
      setFormData(normalizedFormData);
      setOriginalData(normalizedFormData);
      showToast("Convênio atualizado com sucesso!", "success");
    } catch (error) {
      logger.error("Erro ao salvar:", error);
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
              (surgery as any).procedureName ||
              surgery.procedure?.name ||
              surgery.tussProcedure?.description ||
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
              aria-required="true"
            />
            <Input
              label="CNPJ"
              value={formData.cnpj}
              onChange={(e) => handleInputChange("cnpj", e.target.value)}
              mask="cnpj"
              placeholder="00.000.000/0000-00"
            />
            <Input
              label="Registro ANS"
              value={formData.ansRegistry}
              onChange={(e) => handleInputChange("ansRegistry", e.target.value)}
              placeholder="Número de registro na ANS"
            />
            <Input
              label="Telefone principal"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              mask="phone"
              placeholder="(00) 00000-0000"
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
            <Input
              label="CEP"
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              mask="cep"
              placeholder="00000-000"
            />
            <Select
              label="Estado"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              options={STATE_OPTIONS}
            />
            <div>
              <Input
                label="Endereço completo"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, avenida, etc."
              />
            </div>
            <Input
              label="Número"
              value={formData.addressNumber}
              onChange={(e) =>
                handleInputChange("addressNumber", e.target.value)
              }
              placeholder="123"
            />
            <Input
              label="Complemento"
              value={formData.addressComplement}
              onChange={(e) =>
                handleInputChange("addressComplement", e.target.value)
              }
              placeholder="Sala, bloco, apto (opcional)"
            />
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            />
          </div>
          {cepLoading && (
            <p className="text-xs text-gray-500 -mt-2">
              Buscando endereço pelo CEP...
            </p>
          )}
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
              mask="phone"
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
