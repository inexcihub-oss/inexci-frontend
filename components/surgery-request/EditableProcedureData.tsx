"use client";

import { useState, useEffect } from "react";
import { Combobox, Input } from "@/components/ui";
import { hospitalService } from "@/services/hospital.service";
import { healthPlanService } from "@/services/health-plan.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface EditableProcedureDataProps {
  solicitacao: any;
  onUpdate?: () => void;
}

export function EditableProcedureData({
  solicitacao,
  onUpdate,
}: EditableProcedureDataProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Estados para as opções dos selects
  const [hospitals, setHospitals] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [healthPlans, setHealthPlans] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Estados para os valores do formulário
  const [formData, setFormData] = useState({
    hospitalId: solicitacao.hospital?.id?.toString() || "",
    cidId: solicitacao.cid?.id || "",
    healthPlanId: solicitacao.health_plan?.id?.toString() || "",
    healthPlanRegistry: solicitacao.health_plan_registry || "",
    healthPlanType: solicitacao.health_plan_type || "",
  });

  // Carregar dados dos selects
  useEffect(() => {
    const loadSelectData = async () => {
      try {
        // Carregar hospitais
        const hospitalsData = await hospitalService.getAll();
        setHospitals(
          hospitalsData.map((h) => ({
            value: h.id.toString(),
            label: h.name,
          })),
        );

        // Carregar planos de saúde
        const healthPlansData = await healthPlanService.getAll();
        setHealthPlans(
          healthPlansData.map((hp) => ({
            value: hp.id.toString(),
            label: hp.name,
          })),
        );
      } catch (error) {
        console.error("Erro ao carregar dados dos selects:", error);
        showToast("Erro ao carregar opções de seleção", "error");
      }
    };

    if (isEditing) {
      loadSelectData();
    }
  }, [isEditing, showToast]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Resetar valores do formulário
    setFormData({
      hospitalId: solicitacao.hospital?.id?.toString() || "",
      cidId: solicitacao.cid?.id || "",
      healthPlanId: solicitacao.health_plan?.id?.toString() || "",
      healthPlanRegistry: solicitacao.health_plan_registry || "",
      healthPlanType: solicitacao.health_plan_type || "",
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      console.log("=== DEBUG SAVE ===");
      console.log("Form Data:", formData);
      console.log("Solicita\u00e7\u00e3o ID:", solicitacao.id);

      // Buscar dados completos dos itens selecionados
      const hospital = hospitals.find((h) => h.value === formData.hospitalId);
      const healthPlan = healthPlans.find(
        (hp) => hp.value === formData.healthPlanId,
      );

      console.log("Hospital encontrado:", hospital);
      console.log("Health Plan encontrado:", healthPlan);

      if (!hospital || !healthPlan) {
        showToast("Por favor, preencha todos os campos obrigatórios", "error");
        return;
      }

      // Preparar dados para envio conforme DTO do backend
      const updateData = {
        health_plan: {
          id: parseInt(formData.healthPlanId),
          name: healthPlan.label,
          email: solicitacao.health_plan?.email || "",
          phone: solicitacao.health_plan?.phone || "",
        },
        health_plan_registration: formData.healthPlanRegistry,
        health_plan_type: formData.healthPlanType,
        cid: formData.cidId
          ? {
              id: formData.cidId,
              description: solicitacao.cid?.description || "",
            }
          : undefined,
        diagnosis: solicitacao.diagnosis || "",
        medical_report: solicitacao.medical_report || "",
        patient_history: solicitacao.patient_history || "",
        hospital: {
          name: hospital.label,
          email: solicitacao.hospital?.email || "",
        },
      };

      console.log("Dados a serem enviados:", updateData);

      const result = await surgeryRequestService.update(
        solicitacao.id.toString(),
        updateData,
      );

      console.log("Resultado do update:", result);

      showToast("Dados atualizados com sucesso!", "success");

      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Erro ao salvar dados:", error);
      showToast(
        error.response?.data?.message || "Erro ao salvar dados",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-neutral-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 h-10 border-b border-neutral-100">
        <h3 className="text-sm font-semibold text-black">
          Dados do procedimento
        </h3>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1.5 px-3 gap-3 rounded text-sm leading-normal"
          >
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center justify-center font-semibold text-gray-900 bg-white border border-neutral-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors py-1.5 px-3 rounded text-sm leading-normal disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center font-semibold text-gray-900 bg-white border border-neutral-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors py-1.5 px-3 rounded text-sm leading-normal disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-3">
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
              <label className="text-sm font-semibold text-black">
                Hospital
              </label>
              <input
                type="text"
                value={solicitacao.hospital?.name || ""}
                placeholder="Não informado"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
                disabled
              />
            </>
          )}
        </div>

        {/* CID */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="text-sm font-semibold text-black">
                CID (Código Internacional de Doenças)
              </label>
              <input
                type="text"
                value={formData.cidId}
                onChange={(e) =>
                  setFormData({ ...formData, cidId: e.target.value })
                }
                maxLength={6}
                placeholder="Digite o código CID"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </>
          ) : (
            <>
              <label className="text-sm font-semibold text-black">
                CID (Código Internacional de Doenças)
              </label>
              <input
                type="text"
                value={solicitacao.cid?.id || ""}
                placeholder="Não informado"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
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
              <label className="text-sm font-semibold text-black">
                Convênio
              </label>
              <input
                type="text"
                value={solicitacao.health_plan?.name || ""}
                placeholder={
                  !solicitacao.health_plan?.name ? "Não informado" : ""
                }
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
                disabled
              />
            </>
          )}
        </div>

        {/* Matrícula do convênio */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="text-sm font-semibold text-black">
                Matrícula do convênio
              </label>
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
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </>
          ) : (
            <>
              <label className="text-sm font-semibold text-black">
                Matrícula do convênio
              </label>
              <input
                type="text"
                value={solicitacao.health_plan_registry || ""}
                placeholder={
                  !solicitacao.health_plan_registry ? "Não informado" : ""
                }
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
                disabled
              />
            </>
          )}
        </div>

        {/* Plano do convênio */}
        <div className="space-y-1">
          {isEditing ? (
            <>
              <label className="text-sm font-semibold text-black">
                Plano do convênio
              </label>
              <input
                type="text"
                value={formData.healthPlanType}
                onChange={(e) =>
                  setFormData({ ...formData, healthPlanType: e.target.value })
                }
                placeholder="Digite o tipo do plano"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </>
          ) : (
            <>
              <label className="text-sm font-semibold text-black">
                Plano do convênio
              </label>
              <input
                type="text"
                value={solicitacao.health_plan_type || ""}
                placeholder={
                  !solicitacao.health_plan_type ? "Não informado" : ""
                }
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
                disabled
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
