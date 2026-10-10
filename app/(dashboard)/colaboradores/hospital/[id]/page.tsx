"use client";

import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { hospitalService, Hospital } from "@/services/hospital.service";
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
import { useHospital } from "@/hooks/useHospitals";
import { useEntityDetailForm } from "@/hooks/useEntityDetailForm";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

const EMPTY_FORM = {
  name: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
  addressNumber: "",
  city: "",
  state: "",
  zipCode: "",
  neighborhood: "",
  contact: "",
  contactPhone: "",
};
type HospitalForm = typeof EMPTY_FORM;

function toForm(h: Hospital): HospitalForm {
  return {
    name: h.name || "",
    cnpj: maskCnpj(h.cnpj || ""),
    email: h.email || "",
    phone: maskPhone(h.phone || ""),
    address: h.address || "",
    addressNumber: h.addressNumber || "",
    city: h.city || "",
    state: h.state || "",
    zipCode: maskCep(h.zipCode || ""),
    neighborhood: h.neighborhood || "",
    contact: h.contactName || "",
    contactPhone: maskPhone(h.contactPhone || ""),
  };
}

export default function HospitalDetalhePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const podeVerSolicitacoes = can(Permission.SOLICITACOES);
  const { showToast } = useToast();
  const { hospital, isLoading: loading } = useHospital(params.id);
  const { requests: surgeryRequests, loading: loadingSurgeries } =
    useLinkedSurgeryRequests({ hospitalId: params.id }, podeVerSolicitacoes);

  const {
    formData,
    setFormData,
    setField,
    isDirty,
    saving,
    handleSave,
    handleCancel,
  } = useEntityDetailForm({
      entity: hospital,
      emptyForm: EMPTY_FORM,
      toForm,
      validate: (form) =>
        form.name.trim() ? null : "Nome do hospital é obrigatório.",
      normalize: (form) => ({ ...form, name: form.name.trim() }),
      save: async (entity, form) => {
        await hospitalService.update(entity.id, {
          name: form.name,
          cnpj: unmask(form.cnpj) || undefined,
          email: form.email || undefined,
          phone: unmask(form.phone) || undefined,
          address: form.address || undefined,
          addressNumber: form.addressNumber || undefined,
          neighborhood: form.neighborhood || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zipCode: unmask(form.zipCode) || undefined,
          contactName: form.contact || undefined,
          contactPhone: unmask(form.contactPhone) || undefined,
        });
        await queryClient.invalidateQueries({
          queryKey: registryKeys.hospitals(),
        });
      },
      showToast,
      successMessage: "Hospital atualizado com sucesso!",
      backHref: "/colaboradores",
    });
  const handleInputChange = (field: keyof HospitalForm, value: string) =>
    setField(field, value);

  const { loading: cepLoading } = useCepLookup({
    cep: formData.zipCode,
    enabled: !loading,
    onResolved: (data) => {
      setFormData((prev) => ({
        ...prev,
        address: data.logradouro,
        neighborhood: data.bairro,
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

  if (!hospital) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Hospital não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const sidebarContent = (
    <LinkedSurgeryRequestsList
      title="Cirurgias recentes"
      loading={loadingSurgeries}
      requests={surgeryRequests}
      emptyMessage="Nenhuma solicitação encontrada."
      getLines={(surgery) => ({
        primary: linkedProcedureName(surgery, "Procedimento não especificado"),
        secondary: surgery.doctor?.name || "Médico não informado",
      })}
    />
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Hospitais"
        backHref="/hospitais"
        itemName={formData.name}
        itemSubtitle="Hospital"
        sidebarContent={podeVerSolicitacoes ? sidebarContent : undefined}
      >
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do hospital"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            <Input
              label="CNPJ"
              value={formData.cnpj}
              onChange={(e) => handleInputChange("cnpj", e.target.value)}
              mask="cnpj"
              placeholder="00.000.000/0000-00"
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
          </div>
        </FormSection>

        <FormSection title="Endereço">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Endereço completo"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, número, complemento"
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
              options={STATE_OPTIONS}
            />
            <Input
              label="CEP"
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              mask="cep"
              placeholder="00000-000"
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
