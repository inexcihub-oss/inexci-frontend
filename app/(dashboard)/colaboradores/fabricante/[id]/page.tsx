"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import {
  manufacturerService,
  Manufacturer,
} from "@/services/manufacturer.service";
import { maskCnpj, maskPhone, unmask } from "@/lib/masks";
import { useToast } from "@/hooks/useToast";
import { useEntityDetailForm } from "@/hooks/useEntityDetailForm";
import { registryKeys } from "@/lib/query-keys";

const EMPTY_FORM = {
  name: "",
  cnpj: "",
  anvisaRegistration: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
};
type ManufacturerForm = typeof EMPTY_FORM;

function toForm(m: Manufacturer): ManufacturerForm {
  return {
    name: m.name || "",
    cnpj: maskCnpj(m.cnpj || ""),
    anvisaRegistration: m.anvisaRegistration || "",
    email: m.email || "",
    phone: maskPhone(m.phone || ""),
    website: m.website || "",
    country: m.country || "",
    contactName: m.contactName || "",
    contactPhone: maskPhone(m.contactPhone || ""),
    contactEmail: m.contactEmail || "",
    notes: m.notes || "",
  };
}

export default function FabricanteDetalhePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: manufacturer = null, isLoading: loading } = useQuery({
    queryKey: registryKeys.manufacturer(params.id),
    queryFn: () => manufacturerService.getById(params.id),
  });

  const { formData, setField, isDirty, saving, handleSave, handleCancel } =
    useEntityDetailForm({
      entity: manufacturer,
      emptyForm: EMPTY_FORM,
      toForm,
      validate: (form) =>
        form.name.trim() ? null : "Nome do fabricante é obrigatório.",
      normalize: (form) => ({
        ...form,
        name: form.name.trim(),
        cnpj: maskCnpj(form.cnpj),
        phone: maskPhone(form.phone),
        contactPhone: maskPhone(form.contactPhone),
      }),
      save: async (entity, form) => {
        await manufacturerService.update(entity.id, {
          name: form.name,
          cnpj: unmask(form.cnpj) || undefined,
          anvisaRegistration: form.anvisaRegistration || undefined,
          email: form.email || undefined,
          phone: unmask(form.phone) || undefined,
          website: form.website || undefined,
          country: form.country || undefined,
          contactName: form.contactName || undefined,
          contactPhone: unmask(form.contactPhone) || undefined,
          contactEmail: form.contactEmail || undefined,
          notes: form.notes || undefined,
        });
        await queryClient.invalidateQueries({
          queryKey: registryKeys.manufacturers(),
        });
      },
      showToast,
      successMessage: "Fabricante atualizado com sucesso!",
      backHref: "/fabricantes",
    });
  const handleInputChange = (field: keyof ManufacturerForm, value: string) =>
    setField(field, value);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (!manufacturer) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Fabricante não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Fabricantes"
        backHref="/fabricantes"
        itemName={manufacturer.name}
        itemSubtitle="Fabricante"
      >
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do fabricante"
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
              label="Registro ANVISA"
              value={formData.anvisaRegistration}
              onChange={(e) =>
                handleInputChange("anvisaRegistration", e.target.value)
              }
              placeholder="Número do registro/notificação"
            />
            <Input
              label="País"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
              placeholder="Brasil"
            />
            <Input
              label="Telefone"
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

        <FormSection title="Contato comercial">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do contato"
              value={formData.contactName}
              onChange={(e) => handleInputChange("contactName", e.target.value)}
              placeholder="Nome do representante"
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

        <FormSection title="Observações">
          <Input
            label="Notas"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Informações adicionais sobre o fabricante"
          />
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
