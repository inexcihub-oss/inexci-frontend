"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { supplierService, Supplier } from "@/services/supplier.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

export default function FornecedorDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    website: "",
    category: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    neighborhood: "",
    contact: "",
    contactPhone: "",
    contactEmail: "",
    paymentTerms: "",
    deliveryTime: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supplierData = await supplierService.getById(params.id);

      if (!supplierData) {
        console.error("Fornecedor não encontrado");
        setLoading(false);
        return;
      }

      setSupplier(supplierData);

      // Preenche o formulário
      setFormData({
        name: supplierData.name || "",
        cnpj: supplierData.cnpj || "",
        email: supplierData.email || "",
        phone: supplierData.phone || "",
        website: "",
        category: "",
        address: supplierData.address || "",
        city: "",
        state: "",
        zipCode: "",
        neighborhood: "",
        contact: "",
        contactPhone: "",
        contactEmail: "",
        paymentTerms: "",
        deliveryTime: "",
      });
    } catch (error) {
      console.error("Erro ao carregar fornecedor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!supplier) return;

    setSaving(true);
    try {
      await supplierService.update(supplier.id, {
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });
      alert("Fornecedor atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as alterações.");
    } finally {
      setSaving(false);
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

  const categoryOptions = [
    { value: "", label: "Selecione" },
    { value: "opme", label: "OPME (Órteses, Próteses e Materiais)" },
    { value: "medicamentos", label: "Medicamentos" },
    { value: "equipamentos", label: "Equipamentos Médicos" },
    { value: "materiais", label: "Materiais Hospitalares" },
    { value: "instrumentos", label: "Instrumentos Cirúrgicos" },
    { value: "outros", label: "Outros" },
  ];

  const paymentTermsOptions = [
    { value: "", label: "Selecione" },
    { value: "vista", label: "À Vista" },
    { value: "7dias", label: "7 dias" },
    { value: "15dias", label: "15 dias" },
    { value: "30dias", label: "30 dias" },
    { value: "45dias", label: "45 dias" },
    { value: "60dias", label: "60 dias" },
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

  // Sidebar com cotações recentes (mock)
  const recentQuotes = [
    {
      id: "1",
      product: "Prótese de Joelho",
      date: "15/01/2026",
      status: "Aprovada",
      value: "R$ 15.000,00",
    },
    {
      id: "2",
      product: "Parafusos de Titânio",
      date: "12/01/2026",
      status: "Pendente",
      value: "R$ 2.500,00",
    },
    {
      id: "3",
      product: "Kit Artroscopia",
      date: "10/01/2026",
      status: "Aprovada",
      value: "R$ 8.000,00",
    },
    {
      id: "4",
      product: "Placas de Fixação",
      date: "08/01/2026",
      status: "Recusada",
      value: "R$ 4.200,00",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovada":
        return "text-green-600 bg-green-50";
      case "Pendente":
        return "text-yellow-600 bg-yellow-50";
      case "Recusada":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Cotações recentes
        </h3>
      </div>

      {/* Lista de cotações */}
      <div className="flex-1 overflow-y-auto">
        {recentQuotes.map((quote) => (
          <div
            key={quote.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex flex-col flex-1">
              <span className="text-xs font-semibold text-gray-900">
                {quote.product}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{quote.date}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${getStatusColor(quote.status)}`}
                >
                  {quote.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">
                {quote.value}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Colaboradores"
        backHref="/colaboradores"
        itemName={supplier.name}
        itemSubtitle="Fornecedor"
        sidebarContent={sidebarContent}
      >
        {/* Seção: Informações gerais */}
        <FormSection title="Informações gerais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do fornecedor"
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
              label="Categoria"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              options={categoryOptions}
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
              options={stateOptions}
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
        <FormSection title="Contato comercial">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do contato"
              value={formData.contact}
              onChange={(e) => handleInputChange("contact", e.target.value)}
              placeholder="Nome do representante"
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

        {/* Seção: Condições comerciais */}
        <FormSection title="Condições comerciais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Prazo de pagamento"
              value={formData.paymentTerms}
              onChange={(e) =>
                handleInputChange("paymentTerms", e.target.value)
              }
              options={paymentTermsOptions}
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

        {/* Botão de salvar */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/colaboradores")}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            Salvar alterações
          </Button>
        </div>
      </DetailPageLayout>
    </PageContainer>
  );
}
