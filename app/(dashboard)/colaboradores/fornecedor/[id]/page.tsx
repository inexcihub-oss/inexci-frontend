"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import {
  supplierService,
  Supplier,
  SupplierQuotation,
} from "@/services/supplier.service";
import { maskCep, maskCnpj, maskPhone, unmask } from "@/lib/masks";
import { STATE_OPTIONS } from "@/lib/options";
import { useToast } from "@/hooks/useToast";
import { useCepLookup } from "@/hooks/useCepLookup";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ChevronRight } from "lucide-react";
import { logger } from "@/lib/logger";

const CATEGORY_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "opme", label: "OPME (Órteses, Próteses e Materiais)" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "equipamentos", label: "Equipamentos Médicos" },
  { value: "materiais", label: "Materiais Hospitalares" },
  { value: "instrumentos", label: "Instrumentos Cirúrgicos" },
  { value: "outros", label: "Outros" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "vista", label: "À Vista" },
  { value: "7dias", label: "7 dias" },
  { value: "15dias", label: "15 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "45dias", label: "45 dias" },
  { value: "60dias", label: "60 dias" },
];

function formatCurrency(value?: number): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function QuotationStatusBadge({ selected }: { selected: boolean }) {
  return selected ? (
    <span className="text-xs px-2 py-0.5 rounded text-green-600 bg-green-50">
      Selecionada
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded text-gray-500 bg-gray-100">
      Não selecionada
    </span>
  );
}

export default function FornecedorDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    website: "",
    category: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    paymentTerms: "",
    deliveryTime: "",
    notes: "",
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
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.cidade || prev.city,
        state: data.uf || prev.state,
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

  const buildFormData = (s: Supplier) => ({
    name: s.name || "",
    cnpj: maskCnpj(s.cnpj || ""),
    email: s.email || "",
    phone: maskPhone(s.phone || ""),
    website: s.website || "",
    category: s.category || "",
    address: s.address || "",
    addressNumber: s.addressNumber || "",
    addressComplement: s.addressComplement || "",
    neighborhood: s.neighborhood || "",
    city: s.city || "",
    state: s.state || "",
    zipCode: maskCep(s.zipCode || ""),
    contactName: s.contactName || "",
    contactPhone: maskPhone(s.contactPhone || ""),
    contactEmail: s.contactEmail || "",
    paymentTerms: s.paymentTerms || "",
    deliveryTime: s.deliveryTime || "",
    notes: s.notes || "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const supplierData = await supplierService.getById(params.id);
      if (!supplierData) {
        setLoading(false);
        return;
      }
      setSupplier(supplierData);
      const fd = buildFormData(supplierData);
      setFormData(fd);
      setOriginalData(fd);
    } catch (error) {
      logger.error("Erro ao carregar fornecedor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!supplier) return;

    const name = formData.name.trim();
    if (!name) {
      showToast("Nome do fornecedor é obrigatório.", "error");
      return;
    }

    setSaving(true);
    try {
      const normalizedFormData = {
        ...formData,
        name,
        cnpj: maskCnpj(formData.cnpj),
        phone: maskPhone(formData.phone),
        zipCode: maskCep(formData.zipCode),
        contactPhone: maskPhone(formData.contactPhone),
      };

      await supplierService.update(supplier.id, {
        name,
        cnpj: unmask(formData.cnpj) || undefined,
        email: formData.email || undefined,
        phone: unmask(formData.phone) || undefined,
        website: formData.website || undefined,
        category: formData.category || undefined,
        address: formData.address || undefined,
        addressNumber: formData.addressNumber || undefined,
        addressComplement: formData.addressComplement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: unmask(formData.zipCode) || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: unmask(formData.contactPhone) || undefined,
        contactEmail: formData.contactEmail || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        deliveryTime: formData.deliveryTime || undefined,
        notes: formData.notes || undefined,
      });
      setFormData(normalizedFormData);
      setOriginalData(normalizedFormData);
      showToast("Fornecedor atualizado com sucesso!", "success");
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
      router.push("/fornecedores");
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

  if (!supplier) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Fornecedor não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const quotations: SupplierQuotation[] = supplier.quotations ?? [];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Cotações ({quotations.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {quotations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-gray-400">Nenhuma cotação registrada</p>
          </div>
        ) : (
          quotations.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex flex-col flex-1 gap-1">
                <span className="text-xs font-semibold text-gray-900">
                  {q.surgeryRequest?.patient?.name ?? "Paciente não informado"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(q.submissionDate || q.createdAt)}
                  </span>
                  <QuotationStatusBadge selected={q.selected} />
                </div>
                {q.proposalNumber && (
                  <span className="text-xs text-gray-400">
                    Nº {q.proposalNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {formatCurrency(q.totalValue)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
        sectionTitle="Fornecedores"
        backHref="/fornecedores"
        itemName={supplier.name}
        itemSubtitle="Fornecedor"
        sidebarContent={sidebarContent}
      >
        {/* Informações gerais */}
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do fornecedor"
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
            <Select
              label="Categoria"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              options={CATEGORY_OPTIONS}
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

        {/* Endereço */}
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
            <div className="md:col-span-2">
              <Input
                label="Logradouro"
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
          </div>
          {cepLoading && (
            <p className="text-xs text-gray-500 -mt-2">
              Buscando endereço pelo CEP...
            </p>
          )}
        </FormSection>

        {/* Contato comercial */}
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

        {/* Condições comerciais */}
        <FormSection title="Condições comerciais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Prazo de pagamento"
              value={formData.paymentTerms}
              onChange={(e) =>
                handleInputChange("paymentTerms", e.target.value)
              }
              options={PAYMENT_TERMS_OPTIONS}
            />
            <Input
              label="Prazo de entrega"
              value={formData.deliveryTime}
              onChange={(e) =>
                handleInputChange("deliveryTime", e.target.value)
              }
              placeholder="Ex: 5 dias úteis"
            />
          </div>
        </FormSection>

        {/* Observações */}
        <FormSection title="Observações">
          <textarea
            className="ds-input w-full min-h-[100px] resize-y"
            placeholder="Notas adicionais sobre o fornecedor..."
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
          />
        </FormSection>

        {/* Ações */}
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
