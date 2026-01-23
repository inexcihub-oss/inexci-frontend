"use client";

import React, { memo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "@/types/surgery-request.types";
import { useToggle, useClickOutside } from "@/hooks";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { PendencyBadge } from "@/components/pendencies";
import Avatar from "@/components/ui/Avatar";

interface ProcedureCardProps {
  procedure: SurgeryRequest;
  isDragging?: boolean;
}

const priorityStyles: Record<
  PriorityLevel,
  { variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  Baixa: { variant: "info" },
  Média: { variant: "warning" },
  Alta: { variant: "danger" },
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
    case "Em Análise":
    case "Em Reanálise":
      return [
        { icon: CheckCircle, label: "Aprovar", color: "text-green-600" },
        { icon: X, label: "Negar", color: "text-red-600" },
      ];
    case "Autorizada":
      return [
        { icon: Calendar, label: "Agendar", color: "text-green-600" },
        { icon: AlertCircle, label: "Contestar", color: "text-orange-600" },
      ];
    case "Agendada":
      return [
        {
          icon: FileText,
          label: "Iniciar Faturamento",
          color: "text-blue-600",
        },
      ];
    case "A Faturar":
      return [{ icon: FileText, label: "Faturar", color: "text-green-600" }];
    case "Faturada":
      return [
        { icon: CheckCircle, label: "Finalizar", color: "text-green-600" },
      ];
    case "Finalizada":
      return [
        { icon: CheckCircle, label: "Ver Detalhes", color: "text-gray-600" },
      ];
    case "Cancelada":
      return [
        { icon: AlertCircle, label: "Ver Motivo", color: "text-red-600" },
      ];
    default:
      return [];
  }
};

export const ProcedureCard = memo<ProcedureCardProps>(
  ({ procedure, isDragging = false }) => {
    const router = useRouter();
    const {
      value: showActions,
      toggle: toggleActions,
      setFalse: closeActions,
    } = useToggle();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const priorityStyle = priorityStyles[procedure.priority];
    const contextualActions = getContextualActions(procedure.status);

    useClickOutside(dropdownRef, closeActions, showActions);

    const handleActionClick = useCallback(
      (action: string) => {
        // TODO: Implementar lógica de cada ação
        closeActions();
      },
      [closeActions],
    );

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        // Não navegar se clicar no menu de ações
        if (dropdownRef.current?.contains(e.target as Node)) {
          return;
        }
        router.push(`/solicitacao/${procedure.id}`);
      },
      [router, procedure.id],
    );

    return (
      <div
        onClick={handleCardClick}
        className={`bg-white border border-[#DCDFE3] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        {/* Cabeçalho com prioridade, pendências e menu */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {/* Badge de prioridade */}
            <span className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              {procedure.priority}
            </span>

            {/* Badge de pendências aprimorado */}
            {procedure.pendenciesCount > 0 && (
              <PendencyBadge
                total={procedure.pendenciesCount}
                completed={procedure.pendenciesCompleted ?? 0}
                waiting={procedure.pendenciesWaiting ?? 0}
                size="md"
              />
            )}
          </div>

          {/* Menu de ações */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleActions}
              className="p-1.5 hover:bg-gray-50 rounded transition-colors"
            >
              <MoreVertical className="w-6 h-6 text-gray-900" />
            </button>

            {/* Dropdown de ações contextuais */}
            {showActions && contextualActions.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-[#DCDFE3] rounded-lg shadow-sm py-1 min-w-40">
                {contextualActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleActionClick(action.label)}
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

        {/* Nome do paciente com avatar */}
        <div className="flex items-center gap-2 py-1 mb-2">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white border border-[#DCDFE3] flex-shrink-0">
            {procedure.patient.avatarUrl ? (
              <img
                src={procedure.patient.avatarUrl}
                alt={procedure.patient.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600 font-semibold text-lg">
                {getInitials(procedure.patient.name)}
              </div>
            )}
          </div>
          <h3 className="font-semibold text-base text-gray-900 flex-1">
            {procedure.patient.name}
          </h3>
        </div>

        {/* Nome do procedimento */}
        <div className="bg-gray-100 rounded-lg py-2 mb-3">
          <p className="font-semibold text-sm text-gray-900 text-center px-2">
            {procedure.procedureName}
          </p>
        </div>

        {/* Datas */}
        <div className="mb-3">
          <div className="flex items-center py-1">
            <span className="text-sm text-gray-500 flex-1">Criado em:</span>
            <span className="text-sm text-gray-500">{procedure.createdAt}</span>
          </div>
          <div className="flex items-center py-1">
            <span className="text-sm text-gray-500 flex-1">Prazo final:</span>
            <span className="text-sm text-gray-500">{procedure.deadline}</span>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-[#DCDFE3] my-3"></div>

        {/* Rodapé com médico e estatísticas */}
        <div className="flex items-center justify-between">
          {/* Médico */}
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-[#DCDFE3] flex-shrink-0">
              {procedure.doctor.avatarUrl ? (
                <img
                  src={procedure.doctor.avatarUrl}
                  alt={procedure.doctor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600 font-semibold text-xs">
                  {getInitials(procedure.doctor.name)}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-900">
              {procedure.doctor.name}
            </span>
          </div>

          {/* Mensagens e anexos */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">
                {procedure.messagesCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Paperclip className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">
                {procedure.attachmentsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ProcedureCard.displayName = "ProcedureCard";
