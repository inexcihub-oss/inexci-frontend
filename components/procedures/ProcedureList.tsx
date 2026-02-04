"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Paperclip,
  Send,
  Edit,
  X,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  MoreVertical,
} from "lucide-react";
import {
  SurgeryRequest,
  PriorityLevel,
  SurgeryRequestStatus,
  PRIORITY_LABELS,
} from "@/types/surgery-request.types";

interface ProcedureListProps {
  procedures: SurgeryRequest[];
  onProcedureClick?: (procedure: SurgeryRequest) => void;
}

const priorityStyles: Record<
  PriorityLevel,
  { bg: string; text: string; border: string }
> = {
  1: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  2: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
  },
  3: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  4: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  Pendente: { bg: "bg-yellow-100", text: "text-yellow-700" },
  Enviada: { bg: "bg-blue-100", text: "text-blue-700" },
  "Em Análise": { bg: "bg-purple-100", text: "text-purple-700" },
  "Em Reanálise": { bg: "bg-indigo-100", text: "text-indigo-700" },
  Autorizada: { bg: "bg-green-100", text: "text-green-700" },
  Agendada: { bg: "bg-teal-100", text: "text-teal-700" },
  "A Faturar": { bg: "bg-cyan-100", text: "text-cyan-700" },
  Faturada: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Finalizada: { bg: "bg-green-100", text: "text-green-700" },
  Cancelada: { bg: "bg-red-100", text: "text-red-700" },
};

// Ações contextuais baseadas no status
const getContextualActions = (status: SurgeryRequestStatus) => {
  switch (status) {
    case "Pendente":
      return [
        { icon: Edit, label: "Editar", color: "text-blue-600" },
        { icon: Send, label: "Enviar", color: "text-green-600" },
        { icon: X, label: "Cancelar", color: "text-red-600" },
      ];
    case "Enviada":
      return [
        { icon: FileText, label: "Ver Cotações", color: "text-blue-600" },
        { icon: Edit, label: "Anexar Número", color: "text-gray-600" },
      ];
    case "Autorizada":
      return [
        { icon: Calendar, label: "Agendar", color: "text-green-600" },
        { icon: AlertCircle, label: "Contestar", color: "text-orange-600" },
      ];
    case "Cancelada":
      return [
        { icon: AlertCircle, label: "Ver Motivo", color: "text-red-600" },
        { icon: Edit, label: "Contestar", color: "text-orange-600" },
      ];
    case "Finalizada":
      return [
        { icon: CheckCircle, label: "Ver Detalhes", color: "text-gray-600" },
      ];
    default:
      return [];
  }
};

// Componente de linha individual
const ProcedureRow: React.FC<{
  procedure: SurgeryRequest;
  onProcedureClick?: (procedure: SurgeryRequest) => void;
}> = ({ procedure, onProcedureClick }) => {
  const [showActions, setShowActions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const priorityStyle = priorityStyles[procedure.priority];
  const statusStyle =
    statusStyles[procedure.status] || statusStyles["Pendente"];
  const contextualActions = getContextualActions(procedure.status);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActions]);

  const handleActionClick = (action: string) => {
    // TODO: Implementar lógica de cada ação
    setShowActions(false);
  };

  // Função para processar nome do médico (remover especialidade)
  const getDisplayName = (name: string) => {
    const nameParts = name.split(" - ");
    return nameParts[0].trim();
  };

  // Função para gerar iniciais
  const getInitials = (name: string) => {
    const displayName = getDisplayName(name);
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="grid grid-cols-12 gap-4 px-6 py-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
      onClick={() => onProcedureClick?.(procedure)}
    >
      {/* Paciente */}
      <div className="col-span-2 flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200 ${
            procedure.patient.avatarColor || "bg-gray-100"
          }`}
          style={
            procedure.patient.avatarUrl
              ? {
                  backgroundImage: `url(${procedure.patient.avatarUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        >
          {!procedure.patient.avatarUrl && (
            <span className="text-xs font-medium text-gray-600">
              {procedure.patient.initials ||
                procedure.patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="font-semibold text-sm text-gray-900 truncate"
            title={procedure.patient.name}
          >
            {procedure.patient.name}
          </span>
        </div>
      </div>

      {/* Procedimento */}
      <div className="col-span-2 flex items-center min-w-0">
        <span
          className="text-sm text-gray-900 truncate"
          title={procedure.procedureName}
        >
          {procedure.procedureName}
        </span>
      </div>

      {/* Médico */}
      <div className="col-span-2 flex items-center gap-2 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200 ${
            procedure.doctor.avatarColor || "bg-gray-100"
          }`}
          style={
            procedure.doctor.avatarUrl
              ? {
                  backgroundImage: `url(${procedure.doctor.avatarUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        >
          {!procedure.doctor.avatarUrl && (
            <span className="text-xs font-medium text-gray-600">
              {getInitials(procedure.doctor.name)}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-sm text-gray-700 truncate"
            title={getDisplayName(procedure.doctor.name)}
          >
            {getDisplayName(procedure.doctor.name)}
          </span>
        </div>
      </div>

      {/* Status com barra de progresso */}
      <div className="col-span-1 flex flex-col justify-center gap-1">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} text-center whitespace-nowrap`}
          title={`Status: ${procedure.status}`}
        >
          {procedure.status}
        </span>
        <div
          className="w-full bg-gray-200 rounded-full h-1"
          title="Progresso do procedimento"
        >
          <div
            className={`h-1 rounded-full transition-all ${
              procedure.status === "Pendente"
                ? "bg-yellow-500 w-1/5"
                : procedure.status === "Enviada"
                  ? "bg-blue-500 w-2/5"
                  : procedure.status === "Em Análise"
                    ? "bg-purple-500 w-1/2"
                    : procedure.status === "Em Reanálise"
                      ? "bg-indigo-500 w-1/2"
                      : procedure.status === "Autorizada"
                        ? "bg-green-500 w-3/5"
                        : procedure.status === "Agendada"
                          ? "bg-teal-500 w-3/4"
                          : procedure.status === "A Faturar"
                            ? "bg-cyan-500 w-4/5"
                            : procedure.status === "Faturada"
                              ? "bg-emerald-500 w-11/12"
                              : procedure.status === "Finalizada"
                                ? "bg-green-600 w-full"
                                : procedure.status === "Cancelada"
                                  ? "bg-red-500 w-1/3"
                                  : "bg-gray-400 w-1/2"
            }`}
          />
        </div>
      </div>

      {/* Prioridade e Pendências */}
      <div className="col-span-2 flex items-center gap-1.5 justify-start flex-wrap">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} whitespace-nowrap flex-shrink-0`}
          title={`Prioridade: ${PRIORITY_LABELS[procedure.priority]}`}
        >
          {PRIORITY_LABELS[procedure.priority]}
        </span>
        {procedure.pendenciesCount > 0 ? (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-700 flex items-center gap-1 animate-pulse whitespace-nowrap flex-shrink-0"
            title={`${procedure.pendenciesCount} pendência${procedure.pendenciesCount > 1 ? "s" : ""} em aberto`}
          >
            <AlertCircle className="w-3 h-3" />
            <span className="font-semibold">{procedure.pendenciesCount}</span>
          </span>
        ) : (
          procedure.status !== "Finalizada" && (
            <span
              className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-700 flex items-center justify-center flex-shrink-0"
              title="Sem pendências"
            >
              <CheckCircle className="w-3 h-3" />
            </span>
          )
        )}
      </div>

      {/* Datas */}
      <div className="col-span-2 flex items-center gap-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[0.625rem] text-gray-500 uppercase font-medium">
            Criado
          </span>
          <span
            className="text-xs font-semibold text-gray-700 truncate"
            title={`Criado em: ${procedure.createdAt}`}
          >
            {procedure.createdAt}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[0.625rem] text-gray-500 uppercase font-medium">
            Prazo
          </span>
          <span
            className="text-xs font-semibold text-gray-700 truncate"
            title={`Prazo final: ${procedure.deadline}`}
          >
            {procedure.deadline}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="col-span-1 flex items-center justify-end gap-2">
        <div
          className="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 transition-colors"
          title={`${procedure.messagesCount} mensagem${procedure.messagesCount !== 1 ? "ns" : ""}`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{procedure.messagesCount}</span>
        </div>
        <div
          className="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 transition-colors"
          title={`${procedure.attachmentsCount} anexo${procedure.attachmentsCount !== 1 ? "s" : ""}`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {procedure.attachmentsCount}
          </span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {/* Dropdown de ações contextuais */}
          {showActions && contextualActions.length > 0 && (
            <div className="absolute right-0 top-10 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40">
              {contextualActions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(action.label);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${action.color}`}
                >
                  <action.icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProcedureList: React.FC<ProcedureListProps> = ({
  procedures,
  onProcedureClick,
}) => {
  return (
    <div
      className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* Cabeçalho da Tabela */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">
        <div className="col-span-2">Paciente</div>
        <div className="col-span-2">Procedimento</div>
        <div className="col-span-2">Médico</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Prioridade</div>
        <div className="col-span-2">Datas</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>

      {/* Linhas da Tabela */}
      {procedures.map((procedure) => (
        <ProcedureRow
          key={procedure.id}
          procedure={procedure}
          onProcedureClick={onProcedureClick}
        />
      ))}

      {/* Estado vazio */}
      {procedures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold text-neutral-900 mb-2">
            Nenhum procedimento encontrado
          </p>
          <p className="text-sm text-neutral-200">
            Comece criando um novo procedimento cirúrgico
          </p>
        </div>
      )}
    </div>
  );
};
