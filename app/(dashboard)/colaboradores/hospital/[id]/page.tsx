"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { hospitalService, Hospital } from "@/services/hospital.service";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { STATE_OPTIONS } from "@/lib/options";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight } from "lucide-react";

export default function HospitalDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospital, setHospital] = useState<Hospital | null>(null);
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
    address: "",
    city: "",
    state: "",
    zipCode: "",
    neighborhood: "",
    type: "",
    contact: "",
    contactPhone: "",
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
      const hospitalData = await hospitalService.getById(params.id);

      if (!hospitalData) {
        console.error("Hospital não encontrado");
        setLoading(false);
        return;
      }

      setHospital(hospitalData);

      // Preenche o formulário
      setFormData({
        name: hospitalData.name || "",
        cnpj: hospitalData.cnpj || "",
        email: hospitalData.email || "",
        phone: hospitalData.phone || "",
        address: hospitalData.address || "",
        city: hospitalData.city || "",
        state: hospitalData.state || "",
        zipCode: hospitalData.zip_code || "",
        neighborhood: hospitalData.neighborhood || "",
        type: "",
        contact: hospitalData.contact_name || "",
        contactPhone: hospitalData.contact_phone || "",
      });
      setOriginalData({
        name: hospitalData.name || "",
        cnpj: hospitalData.cnpj || "",
        email: hospitalData.email || "",
        phone: hospitalData.phone || "",
        address: hospitalData.address || "",
        city: hospitalData.city || "",
        state: hospitalData.state || "",
        zipCode: hospitalData.zip_code || "",
        neighborhood: hospitalData.neighborhood || "",
        type: "",
        contact: hospitalData.contact_name || "",
        contactPhone: hospitalData.contact_phone || "",
      });
      // Buscar solicitações cirúrgicas deste hospital
      setLoadingSurgeries(true);
      try {
        const surgeryData = await surgeryRequestService.getAll();
        const filtered = (surgeryData.records ?? []).filter(
          (r: any) =>
            String(r.hospital_id) === String(hospitalData.id) ||
            String(r.hospital?.id) === String(hospitalData.id),
        );
        setSurgeryRequests(filtered);
      } catch {
        setSurgeryRequests([]);
      } finally {
        setLoadingSurgeries(false);
      }
    } catch (error) {
      console.error("Erro ao carregar hospital:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!hospital) return;

    setSaving(true);
    try {
      await hospitalService.update(hospital.id, {
        name: formData.name,
        cnpj: formData.cnpj || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zipCode.replace(/\D/g, "") || undefined,
      });
      setOriginalData(formData);
      showToast("Hospital atualizado com sucesso!", "success");
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

  if (!hospital) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Hospital não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const hospitalTypeOptions = [
    { value: "", label: "Selecione" },
    { value: "publico", label: "Público" },
    { value: "privado", label: "Privado" },
    { value: "filantrópico", label: "Filantrópico" },
    { value: "universitário", label: "Universitário" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Cirurgias recentes
        </h3>
        {!loadingSurgeries && (
          <span className="text-xs text-gray-400">
            {surgeryRequests.length}
          </span>
        )}
      </div>

      {/* Lista de cirurgias */}
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
            const procedureName =
              (surgery as any).procedure_name ||
              surgery.procedure?.name ||
              surgery.tuss_procedure?.description ||
              "Procedimento não especificado";
            const doctorName = surgery.doctor?.name || "Médico não informado";
            return (
              <div
                key={surgery.id}
                onClick={() => router.push(`/solicitacao/${surgery.id}`)}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {procedureName}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {doctorName}
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
        sectionTitle="Hospitais"
        backHref="/hospitais"
        itemName={formData.name}
        itemSubtitle="Hospital"
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações gerais */}
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do hospital"
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
            <Select
              label="Tipo de hospital"
              value={formData.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              options={hospitalTypeOptions}
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
