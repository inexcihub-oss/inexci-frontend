"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { clinicService, Clinic } from "@/services/clinic.service";
import {
  BusinessHours,
  emptyBusinessHours,
} from "@/lib/business-hours";
import { BusinessHoursEditor, validarGrade } from "@/components/clinics/BusinessHoursEditor";
import { logger } from "@/lib/logger";
import { maskCep, maskCnpj, maskPhone, unmask } from "@/lib/masks";
import { STATE_OPTIONS } from "@/lib/options";
import { useToast } from "@/hooks/useToast";
import { useCepLookup } from "@/hooks/useCepLookup";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";

export default function ClinicaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // Form state (dados da clínica)
  const [formData, setFormData] = useState({
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
  });
  const [originalData, setOriginalData] = useState<typeof formData | null>(
    null,
  );

  // Grade de funcionamento: estado separado do restante do formulário, mas
  // participa do mesmo `isDirty` — ver `originalBusinessHours` abaixo.
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    emptyBusinessHours(),
  );
  const [originalBusinessHours, setOriginalBusinessHours] =
    useState<BusinessHours | null>(null);
  const errosGrade = validarGrade(businessHours);
  const gradeInvalida = Object.keys(errosGrade).length > 0;

  // `isDirty` cobre formulário e grade: editar só a grade e cancelar não pode
  // navegar para fora em silêncio, descartando a edição sem reverter nada.
  const isDirty =
    originalData !== null &&
    (JSON.stringify(formData) !== JSON.stringify(originalData) ||
      JSON.stringify(businessHours) !== JSON.stringify(originalBusinessHours));

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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const clinicData = await clinicService.getById(params.id);

      if (!clinicData) {
        logger.error("Clínica não encontrada");
        setLoading(false);
        return;
      }

      setClinic(clinicData);

      const dados = {
        name: clinicData.name || "",
        cnpj: maskCnpj(clinicData.cnpj || ""),
        email: clinicData.email || "",
        phone: maskPhone(clinicData.phone || ""),
        address: clinicData.address || "",
        addressNumber: clinicData.addressNumber || "",
        city: clinicData.city || "",
        state: clinicData.state || "",
        zipCode: maskCep(clinicData.zipCode || ""),
        neighborhood: clinicData.neighborhood || "",
      };
      setFormData(dados);
      setOriginalData(dados);
      setBusinessHours(clinicData.businessHours);
      setOriginalBusinessHours(clinicData.businessHours);
    } catch (error) {
      logger.error("Erro ao carregar clínica:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!clinic || gradeInvalida) return;

    const name = formData.name.trim();
    if (!name) {
      showToast("Nome da clínica é obrigatório.", "error");
      return;
    }

    setSaving(true);
    try {
      const normalizedFormData = { ...formData, name };
      await clinicService.update(params.id, {
        ...formData,
        name,
        cnpj: unmask(formData.cnpj),
        zipCode: unmask(formData.zipCode),
        phone: unmask(formData.phone),
        businessHours,
      });
      setFormData(normalizedFormData);
      setOriginalData(normalizedFormData);
      setOriginalBusinessHours(businessHours);
      showToast("Clínica atualizada com sucesso!", "success");
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
      // Mesma fonte original que o `isDirty` usa para comparar — evita as
      // duas divergirem entre si.
      setBusinessHours(originalBusinessHours ?? emptyBusinessHours());
    } else {
      router.push("/clinicas");
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

  if (!clinic) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Clínica não encontrada.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Clínicas"
        backHref="/clinicas"
        itemName={formData.name}
        itemSubtitle="Clínica"
      >
        {/* Seção: Dados da clínica */}
        <FormSection title="Dados da clínica">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome da clínica"
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
              label="CEP"
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              mask="cep"
              placeholder="00000-000"
            />
            <div>
              <Input
                label="Endereço"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, avenida..."
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
          </div>
          {cepLoading && (
            <p className="text-xs text-gray-500 -mt-2">
              Buscando endereço pelo CEP...
            </p>
          )}
        </FormSection>

        {/* Seção: Horário de atendimento */}
        <FormSection title="Horário de atendimento">
          <p className="mb-3 text-xs text-neutral-500">
            Dias e horários em que a unidade atende. Ao agendar uma consulta
            fora desta grade, quem marca recebe um aviso e precisa confirmar.
          </p>
          <BusinessHoursEditor
            value={businessHours}
            onChange={setBusinessHours}
            disabled={saving}
          />
        </FormSection>

        {/* Botão de salvar */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || gradeInvalida}>
            {saving ? "Salvando..." : "Salvar"}
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
