"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Combobox } from "@/components/ui";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { useHospitals } from "@/hooks/useHospitals";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { cidService, CidItem } from "@/services/cid.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { useToast } from "@/hooks/useToast";

interface EditableProcedureDataProps {
  solicitacao: SurgeryRequestDetail;
  onUpdate?: () => void;
  readOnly?: boolean;
}

export function EditableProcedureData({
  solicitacao,
  onUpdate,
  readOnly = false,
}: EditableProcedureDataProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Opções dos selects (cadastros estáveis — cacheados via TanStack Query)
  const { data: hospitalsData, isError: hospitalsError } = useHospitals({
    enabled: isEditing,
  });
  const { data: healthPlansData, isError: healthPlansError } = useHealthPlans({
    enabled: isEditing,
  });
  const hospitals = useMemo(
    () => (hospitalsData ?? []).map((h) => ({ value: h.id.toString(), label: h.name })),
    [hospitalsData],
  );
  const healthPlans = useMemo(
    () =>
      (healthPlansData ?? []).map((hp) => ({
        value: hp.id.toString(),
        label: hp.name,
      })),
    [healthPlansData],
  );

  // Estados para os valores do formulário
  const [formData, setFormData] = useState({
    hospitalId: solicitacao.hospital?.id?.toString() || "",
    cidCode: solicitacao.cid?.code || "",
    healthPlanId: solicitacao.healthPlan?.id?.toString() || "",
    healthPlanRegistry: solicitacao.healthPlanRegistration || "",
    healthPlanType: solicitacao.healthPlanType || "",
  });

  // Label de exibição do CID (inclui a descrição buscada da API quando necessário)
  const buildCidDisplayLabel = (
    code: string | null | undefined,
    description: string | null | undefined,
  ) => {
    if (!code) return "";
    if (description) return `${code} - ${description}`;
    return code;
  };

  const [cidDisplayLabel, setCidDisplayLabel] = useState(
    buildCidDisplayLabel(
      solicitacao.cid?.code,
      solicitacao.cid?.description,
    ),
  );

  // Sincroniza o label do CID quando a solicitação é atualizada
  useEffect(() => {
    const code = solicitacao.cid?.code;
    const description = solicitacao.cid?.description;

    if (!code) {
      setCidDisplayLabel("");
      return;
    }

    if (description) {
      setCidDisplayLabel(`${code} - ${description}`);
      return;
    }

    // Fallback: busca a descrição na API pelo código
    cidService
      .search(code, 10)
      .then((res) => {
        const found = res.records.find(
          (r) => r.id === code || r.code === code,
        );
        if (found) {
          setCidDisplayLabel(`${found.code} - ${found.description}`);
        } else {
          setCidDisplayLabel(code);
        }
      })
      .catch(() => {
        setCidDisplayLabel(code);
      });
  }, [solicitacao.cid]);

  // Função para buscar CIDs
  const searchCid = useCallback(async (search: string) => {
    const response = await cidService.search(search, 50);
    return response.records.map((item: CidItem) => ({
      value: item.id,
      label: `${item.code} - ${item.description}`,
    }));
  }, []);

  // Erro ao carregar opções dos selects (dados em si vêm do cache via hooks acima)
  useEffect(() => {
    if (isEditing && (hospitalsError || healthPlansError)) {
      showToast("Erro ao carregar opções de seleção", "error");
    }
  }, [isEditing, hospitalsError, healthPlansError, showToast]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Resetar valores do formulário
    setFormData({
      hospitalId: solicitacao.hospital?.id?.toString() || "",
      cidCode: solicitacao.cid?.code || "",
      healthPlanId: solicitacao.healthPlan?.id?.toString() || "",
      healthPlanRegistry: solicitacao.healthPlanRegistration || "",
      healthPlanType: solicitacao.healthPlanType || "",
    });
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Buscar dados completos dos itens selecionados (se preenchidos)
      const hospital = formData.hospitalId
        ? hospitals.find((h) => h.value === formData.hospitalId)
        : null;

      const healthPlan = formData.healthPlanId
        ? healthPlans.find((hp) => hp.value === formData.healthPlanId)
        : null;

      // Se selecionou hospital mas não encontrou na lista
      if (formData.hospitalId && !hospital) {
        showToast("Erro ao buscar hospital selecionado", "error");
        return;
      }

      // Se selecionou convênio mas não encontrou na lista
      if (formData.healthPlanId && !healthPlan) {
        showToast("Erro ao buscar convênio selecionado", "error");
        return;
      }

      // Preparar dados para envio conforme DTO do backend
      const updateData: Record<string, unknown> = {
        id: solicitacao.id,
      };

      // Adicionar hospital se preenchido, ou null se foi limpo
      if (hospital) {
        updateData.hospital = {
          name: hospital.label,
          email: solicitacao.hospital?.email || "contato@hospital.com",
        };
      } else if (!formData.hospitalId) {
        updateData.hospital = null;
      }

      // Adicionar convênio se preenchido, ou null se foi limpo
      if (healthPlan) {
        updateData.healthPlan = {
          id: formData.healthPlanId,
          name: healthPlan.label,
          email: solicitacao.healthPlan?.email || "contato@convenio.com",
          phone: solicitacao.healthPlan?.phone || "0000000000",
        };
      } else if (!formData.healthPlanId) {
        updateData.healthPlan = null;
      }
      // Sempre envia matrícula e plano (permite limpar os campos)
      updateData.healthPlanRegistration = formData.healthPlanRegistry || null;
      updateData.healthPlanType = formData.healthPlanType || null;

      // Adicionar CID se preenchido, ou null se foi limpo
      if (formData.cidCode) {
        updateData.cid = { code: formData.cidCode };
      } else {
        updateData.cid = null;
      }

      await surgeryRequestService.update(solicitacao.id.toString(), updateData);

      showToast("Dados atualizados com sucesso!", "success");
      setIsEditing(false);
      onUpdate?.();
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, "Erro ao salvar dados"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-neutral-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 h-9 md:h-11 border-b border-neutral-100">
        <h3 className="text-xs md:text-sm font-semibold text-black">
          Dados do procedimento
        </h3>
        {!isEditing ? (
          !readOnly && (
            <button
              onClick={handleEdit}
              className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1 px-2.5 md:py-1.5 md:px-3 gap-2 rounded-xl text-xs md:text-sm leading-normal"
            >
              Editar
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center justify-center font-semibold text-gray-900 bg-white border border-neutral-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors py-1 px-2.5 md:py-1.5 md:px-3 rounded text-xs md:text-sm leading-normal disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              type="button"
              className="flex items-center justify-center font-semibold text-gray-900 bg-white border border-neutral-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors py-1 px-2.5 md:py-1.5 md:px-3 rounded text-xs md:text-sm leading-normal disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>
      <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 md:gap-y-4">
        {/* Hospital */}
        <div className="space-y-1">
          {isEditing ? (
            <Combobox
              label="Hospital"
              options={hospitals}
              value={formData.hospitalId}
              onValueChange={(value) =>
                setFormData({ ...formData, hospitalId: value })
              }
              placeholder="Selecione um hospital"
              searchPlaceholder="Buscar hospital..."
              emptyText="Nenhum hospital encontrado"
            />
          ) : (
            <>
              <label className="ds-label mb-0">Hospital</label>
              <input
                type="text"
                value={solicitacao.hospital?.name || ""}
                placeholder="Não informado"
                className={`ds-field-readonly bg-gray-50 cursor-default ${
                  solicitacao.hospital?.name
                    ? "text-gray-500"
                    : "text-gray-400 italic"
                }`}
                disabled
              />
            </>
          )}
        </div>

        {/* CID */}
        <div className="space-y-1 min-w-0">
          {isEditing ? (
            <SelectSearch
              label="CID (Código Internacional de Doenças)"
              value={formData.cidCode}
              initialLabel={
                formData.cidCode ? cidDisplayLabel || formData.cidCode : ""
              }
              onChange={(value) => {
                setFormData({
                  ...formData,
                  cidCode: value,
                });
              }}
              onSearch={searchCid}
              placeholder="Buscar CID..."
              className="min-w-0 w-full"
            />
          ) : (
            <>
              <label className="ds-label mb-0">
                CID (Código Internacional de Doenças)
              </label>
              <input
                type="text"
                value={cidDisplayLabel}
                placeholder="Não informado"
                className={`ds-field-readonly bg-gray-50 cursor-default ${
                  cidDisplayLabel ? "text-gray-500" : "text-gray-400 italic"
                }`}
                disabled
              />
            </>
          )}
        </div>

        {/* Convênio */}
        <div className="space-y-1">
          {isEditing ? (
            <Combobox
              label="Convênio"
              options={healthPlans}
              value={formData.healthPlanId}
              onValueChange={(value) =>
                setFormData({ ...formData, healthPlanId: value })
              }
              placeholder="Selecione um convênio"
              searchPlaceholder="Buscar convênio..."
              emptyText="Nenhum convênio encontrado"
            />
          ) : (
            <>
              <label className="ds-label mb-0">Convênio</label>
              <input
                type="text"
                value={solicitacao.healthPlan?.name || ""}
                placeholder="Não informado"
                className={`ds-field-readonly bg-gray-50 cursor-default ${
                  solicitacao.healthPlan?.name
                    ? "text-gray-500"
                    : "text-gray-400 italic"
                }`}
                disabled
              />
            </>
          )}
        </div>

        {/* Matrícula do convênio */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="ds-label mb-0">Matrícula do convênio</label>
              <input
                type="text"
                value={formData.healthPlanRegistry}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    healthPlanRegistry: e.target.value,
                  })
                }
                maxLength={20}
                placeholder="Digite a matrícula"
                className="ds-input"
              />
            </>
          ) : (
            <>
              <label className="ds-label mb-0">Matrícula do convênio</label>
              <input
                type="text"
                value={solicitacao.healthPlanRegistration || ""}
                placeholder="Não informado"
                className={`ds-field-readonly bg-gray-50 cursor-default ${
                  solicitacao.healthPlanRegistration
                    ? "text-gray-500"
                    : "text-gray-400 italic"
                }`}
                disabled
              />
            </>
          )}
        </div>

        {/* Plano do convênio */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="ds-label mb-0">Plano do convênio</label>
              <input
                type="text"
                value={formData.healthPlanType}
                onChange={(e) =>
                  setFormData({ ...formData, healthPlanType: e.target.value })
                }
                placeholder="Digite o tipo do plano"
                className="ds-input"
              />
            </>
          ) : (
            <>
              <label className="ds-label mb-0">Plano do convênio</label>
              <input
                type="text"
                value={solicitacao.healthPlanType || ""}
                placeholder="Não informado"
                className={`ds-field-readonly bg-gray-50 cursor-default ${
                  solicitacao.healthPlanType
                    ? "text-gray-500"
                    : "text-gray-400 italic"
                }`}
                disabled
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
