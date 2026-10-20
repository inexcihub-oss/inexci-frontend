"use client";

import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import {
  LinkedSurgeryRequestsList,
  linkedProcedureName,
  useLinkedSurgeryRequests,
} from "@/components/colaboradores/LinkedSurgeryRequestsList";
import { maskCep, maskCnpj, maskPhone, unmask } from "@/lib/masks";
import { STATE_OPTIONS } from "@/lib/options";
import { registryKeys } from "@/lib/query-keys";
import { useToast } from "@/hooks/useToast";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useHealthPlan } from "@/hooks/useHealthPlans";
import { useEntityDetailForm } from "@/hooks/useEntityDetailForm";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

const EMPTY_FORM = {
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
};
type HealthPlanForm = typeof EMPTY_FORM;

function toForm(hp: HealthPlan): HealthPlanForm {
  return {
    name: hp.name || "",
    cnpj: maskCnpj(hp.cnpj || ""),
    email: hp.email || "",
    phone: maskPhone(hp.phone || ""),
    website: hp.website || "",
    ansRegistry: hp.ansCode || "",
    address: hp.address || "",
    addressNumber: hp.addressNumber || "",
    addressComplement: hp.addressComplement || "",
    city: hp.city || "",
    state: hp.state || "",
    zipCode: maskCep(hp.zipCode || ""),
    contact: hp.authorizationContact || "",
    contactPhone: maskPhone(hp.authorizationPhone || ""),
    contactEmail: hp.authorizationEmail || "",
  };
}

export default function ConvenioDetalhePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const podeVerSolicitacoes = can(Permission.SOLICITACOES);
  const { showToast } = useToast();
  const { healthPlan, isLoading: loading } = useHealthPlan(params.id);
  const { requests: surgeryRequests, loading: loadingSurgeries } =
    useLinkedSurgeryRequests({ healthPlanId: params.id }, podeVerSolicitacoes);

  const {
    formData,
    setFormData,
    setField,
    isDirty,
    saving,
    handleSave,
    handleCancel,
  } = useEntityDetailForm({
    entity: healthPlan,
    emptyForm: EMPTY_FORM,
    toForm,
    validate: (form) =>
      form.name.trim() ? null : "Nome do convênio é obrigatório.",
    normalize: (form) => ({ ...form, name: form.name.trim() }),
    save: async (entity, form) => {
      await healthPlanService.update(entity.id, {
        name: form.name,
        cnpj: unmask(form.cnpj) || undefined,
        email: form.email || undefined,
        phone: unmask(form.phone) || undefined,
        ansCode: form.ansRegistry || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: unmask(form.zipCode) || undefined,
        authorizationContact: form.contact || undefined,
        authorizationPhone: unmask(form.contactPhone) || undefined,
        authorizationEmail: form.contactEmail || undefined,
      });
      await queryClient.invalidateQueries({
        queryKey: registryKeys.healthPlans(),
      });
    },
    showToast,
    successMessage: "Convênio atualizado com sucesso!",
    backHref: "/colaboradores",
  });
  const handleInputChange = (field: keyof HealthPlanForm, value: string) =>
    setField(field, value);

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
    <LinkedSurgeryRequestsList
      title="Solicitações recentes"
      loading={loadingSurgeries}
      requests={surgeryRequests}
      emptyMessage="Nenhuma solicitação encontrada."
      getLines={(surgery) => ({
        primary: surgery.patient?.name || "Paciente não informado",
        secondary: linkedProcedureName(surgery, "Procedimento não especificado"),
      })}
    />
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Convênios"
        backHref="/convenios"
        itemName={formData.name}
        itemSubtitle="Convênio"
        sidebarContent={podeVerSolicitacoes ? sidebarContent : undefined}
      >
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

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </DetailPageLayout>
    </PageContainer>
  );
}
