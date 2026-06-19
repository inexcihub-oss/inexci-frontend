"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { logger } from "@/lib/logger";

export default function FabricanteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
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

  const buildFormData = (m: Manufacturer) => ({
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
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const manufacturerData = await manufacturerService.getById(params.id);
      if (!manufacturerData) {
        setLoading(false);
        return;
      }
      setManufacturer(manufacturerData);
      const fd = buildFormData(manufacturerData);
      setFormData(fd);
      setOriginalData(fd);
    } catch (error) {
      logger.error("Erro ao carregar fabricante:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!manufacturer) return;

    const name = formData.name.trim();
    if (!name) {
      showToast("Nome do fabricante é obrigatório.", "error");
      return;
    }

    setSaving(true);
    try {
      const normalizedFormData = {
        ...formData,
        name,
        cnpj: maskCnpj(formData.cnpj),
        phone: maskPhone(formData.phone),
        contactPhone: maskPhone(formData.contactPhone),
      };

      await manufacturerService.update(manufacturer.id, {
        name,
        cnpj: unmask(formData.cnpj) || undefined,
        anvisaRegistration: formData.anvisaRegistration || undefined,
        email: formData.email || undefined,
        phone: unmask(formData.phone) || undefined,
        website: formData.website || undefined,
        country: formData.country || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: unmask(formData.contactPhone) || undefined,
        contactEmail: formData.contactEmail || undefined,
        notes: formData.notes || undefined,
      });
      setFormData(normalizedFormData);
      setOriginalData(normalizedFormData);
      showToast("Fabricante atualizado com sucesso!", "success");
    } catch (error) {
      logger.error("Erro ao salvar fabricante:", error);
      showToast("Erro ao salvar as alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && originalData) {
      setFormData(originalData);
    } else {
      router.push("/fabricantes");
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
