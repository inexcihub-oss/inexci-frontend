"use client";

import React, { useState, useEffect } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface MedicalReportEditorProps {
  solicitacao: any;
  onUpdate: () => void;
}

interface ReportData {
  patientIdentification: string;
  surgicalIndication: string;
  technicalJustification: string;
}

export function MedicalReportEditor({
  solicitacao,
  onUpdate,
}: MedicalReportEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    patientIdentification: "",
    surgicalIndication: "",
    technicalJustification: "",
  });
  const { showToast } = useToast();

  // Parse existing medical_report or generate default
  useEffect(() => {
    if (solicitacao.medical_report) {
      // Tentar parsear o JSON salvo
      try {
        const parsed = JSON.parse(solicitacao.medical_report);
        setReportData(parsed);
      } catch {
        // Se não for JSON, usar como texto completo na justificativa
        setReportData({
          patientIdentification: generatePatientIdentification(),
          surgicalIndication: generateSurgicalIndication(),
          technicalJustification: solicitacao.medical_report,
        });
      }
    } else {
      // Gerar dados padrão baseados na solicitação
      setReportData({
        patientIdentification: generatePatientIdentification(),
        surgicalIndication: generateSurgicalIndication(),
        technicalJustification: "",
      });
    }
  }, [solicitacao]);

  const generatePatientIdentification = () => {
    const patient = solicitacao.patient;
    if (!patient) return "";

    const lines = [];
    if (patient.name) lines.push(`Nome: ${patient.name}`);
    if (patient.cpf) lines.push(`CPF: ${patient.cpf}`);
    if (patient.birth_date) {
      const birthDate = new Date(patient.birth_date).toLocaleDateString(
        "pt-BR"
      );
      lines.push(`Data de Nascimento: ${birthDate}`);
    }
    if (solicitacao.health_plan_registration) {
      lines.push(`Nº da Carteira: ${solicitacao.health_plan_registration}`);
    }

    return lines.join("\n");
  };

  const generateSurgicalIndication = () => {
    const procedure = solicitacao.procedures?.[0]?.procedure;
    if (!procedure) return "";
    return procedure.name || "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reportJson = JSON.stringify(reportData);
      await surgeryRequestService.update(solicitacao.id, {
        medical_report: reportJson,
      });
      showToast("Laudo salvo com sucesso", "success");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar laudo:", error);
      showToast("Erro ao salvar laudo", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    // Primeiro salva o laudo
    await handleSave();
    // Aqui poderia mudar um status de "rascunho" para "aprovado"
    // Por enquanto, apenas salva
    showToast("Laudo aprovado", "success");
  };

  const reportStatus = solicitacao.medical_report ? "draft" : "empty";

  const getStatusBadge = () => {
    switch (reportStatus) {
      case "draft":
        return (
          <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-purple-50">
            <span className="font-medium text-sm leading-tight text-purple-500">
              Rascunho
            </span>
          </div>
        );
      case "empty":
        return (
          <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-gray-100">
            <span className="font-medium text-sm leading-tight text-gray-500">
              Vazio
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
        {/* Banner de Aviso */}
        <div className="flex flex-col justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50">
          <p className="m-0">
            <span className="block font-semibold text-sm leading-6 text-blue-600">
              Modo de Edição
            </span>
            <span className="block mt-1 font-normal text-sm leading-none text-blue-600">
              Edite os campos abaixo e clique em Salvar para guardar as
              alterações.
            </span>
          </p>
        </div>

        {/* Container do Laudo - Edição */}
        <div className="flex-1 flex flex-col relative px-4 py-4 border border-neutral-100 rounded-xl bg-white overflow-auto gap-4">
          {/* Identificação do Paciente */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              IDENTIFICAÇÃO DO PACIENTE
            </label>
            <textarea
              value={reportData.patientIdentification}
              onChange={(e) =>
                setReportData({
                  ...reportData,
                  patientIdentification: e.target.value,
                })
              }
              rows={4}
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Nome, CPF, Data de Nascimento, Nº da Carteira..."
            />
          </div>

          {/* Indicação Cirúrgica */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              INDICAÇÃO CIRÚRGICA
            </label>
            <input
              type="text"
              value={reportData.surgicalIndication}
              onChange={(e) =>
                setReportData({
                  ...reportData,
                  surgicalIndication: e.target.value,
                })
              }
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Ex: Artroplastia Total de Quadril Direito"
            />
          </div>

          {/* Justificativa Técnica */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              JUSTIFICATIVA TÉCNICA
            </label>
            <textarea
              value={reportData.technicalJustification}
              onChange={(e) =>
                setReportData({
                  ...reportData,
                  technicalJustification: e.target.value,
                })
              }
              rows={8}
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Descreva a justificativa técnica para o procedimento..."
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center justify-center px-4 h-10 gap-1 rounded-lg bg-transparent hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            <span className="font-normal text-sm leading-tight text-gray-600">
              Cancelar
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center px-4 h-10 gap-1 bg-teal-700 hover:bg-teal-800 transition-colors rounded-lg disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="font-semibold text-sm leading-tight text-white">
                  Salvando...
                </span>
              </span>
            ) : (
              <span className="font-semibold text-sm leading-tight text-white">
                Salvar Laudo
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Modo de visualização
  return (
    <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
      {/* Banner de Aviso IA */}
      {reportStatus === "draft" && (
        <div className="flex flex-col justify-center gap-2 px-4 py-3 rounded-xl bg-purple-50">
          <p className="m-0">
            <span className="block font-semibold text-sm leading-6 text-purple-500">
              Laudo em rascunho
            </span>
            <span className="block mt-1 font-normal text-sm leading-none text-purple-500">
              Revise e edite o laudo conforme necessário antes de aprovar.
            </span>
          </p>
        </div>
      )}

      {reportStatus === "empty" && (
        <div className="flex flex-col justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50">
          <p className="m-0">
            <span className="block font-semibold text-sm leading-6 text-amber-600">
              Laudo não preenchido
            </span>
            <span className="block mt-1 font-normal text-sm leading-none text-amber-600">
              Clique em "Editar Laudo" para preencher as informações do laudo
              médico.
            </span>
          </p>
        </div>
      )}

      {/* Container do Laudo */}
      <div className="flex-1 flex flex-col relative px-4 py-4 border border-neutral-100 rounded-xl bg-white overflow-auto gap-2">
        {/* Badge Status - Posicionamento Absoluto */}
        <div className="absolute top-3 right-4">{getStatusBadge()}</div>

        {/* Texto do Laudo */}
        <div className="flex-1 overflow-auto font-normal text-sm leading-relaxed text-gray-900">
          {reportData.patientIdentification && (
            <p className="mb-4">
              <strong className="font-semibold">
                IDENTIFICAÇÃO DO PACIENTE
              </strong>
              <br />
              {reportData.patientIdentification.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </p>
          )}

          {reportData.surgicalIndication && (
            <p className="mb-4">
              <strong className="font-semibold">INDICAÇÃO CIRÚRGICA</strong>
              <br />
              {reportData.surgicalIndication}
            </p>
          )}

          {reportData.technicalJustification && (
            <p className="mb-0">
              <strong className="font-semibold">JUSTIFICATIVA TÉCNICA</strong>
              <br />
              {reportData.technicalJustification}
            </p>
          )}

          {!reportData.patientIdentification &&
            !reportData.surgicalIndication &&
            !reportData.technicalJustification && (
              <div className="text-center py-8 text-gray-400">
                Nenhum conteúdo no laudo. Clique em "Editar Laudo" para começar.
              </div>
            )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end gap-2">
        {/* Botão Editar Laudo */}
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center justify-center px-4 h-10 gap-1 rounded-lg bg-transparent hover:bg-gray-50 transition-colors"
        >
          <span className="font-normal text-sm leading-tight text-teal-700">
            Editar Laudo
          </span>
        </button>

        {/* Botão Aprovar Laudo */}
        {reportStatus === "draft" && (
          <button
            onClick={handleApprove}
            disabled={isSaving}
            className="flex items-center justify-center px-4 h-10 gap-1 bg-white border border-neutral-100 hover:bg-gray-50 transition-colors rounded-lg shadow-sm disabled:opacity-50"
          >
            <span className="font-semibold text-sm leading-tight text-teal-700">
              Aprovar Laudo
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
