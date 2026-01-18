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
    case "Aprovada":
      return [
        { icon: Calendar, label: "Agendar", color: "text-green-600" },
        { icon: AlertCircle, label: "Contestar", color: "text-orange-600" },
      ];
    case "Recusada":
      return [
        { icon: AlertCircle, label: "Ver Motivo", color: "text-red-600" },
        { icon: Edit, label: "Contestar", color: "text-orange-600" },
      ];
    case "Concluída":
      return [
        { icon: CheckCircle, label: "Ver Detalhes", color: "text-gray-600" },
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
        console.log(`Ação: ${action} - Procedimento: ${procedure.id}`);
        // TODO: Implementar lógica de cada ação
        closeActions();
      },
      [procedure.id, closeActions],
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
        className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        {/* Cabeçalho com prioridade e pendências */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Badge de prioridade */}
            <Badge variant={priorityStyle.variant} size="sm">
              {procedure.priority}
            </Badge>

            {/* Badge de pendências com indicador visual */}
            {procedure.pendenciesCount > 0 && (
              <Badge variant="danger" size="sm" className="animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1" />
                {procedure.pendenciesCount} pendência
                {procedure.pendenciesCount > 1 ? "s" : ""}
              </Badge>
            )}

            {/* Indicador de sem pendências */}
            {procedure.pendenciesCount === 0 &&
              procedure.status !== "Concluída" && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Sem pendências
                </Badge>
              )}
          </div>

          {/* Menu de ações */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleActions}
              className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown de ações contextuais */}
            {showActions && contextualActions.length > 0 && (
              <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40">
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

        {/* Nome do paciente */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            name={procedure.patient.name}
            src={procedure.patient.avatarUrl}
            size="lg"
          />
          <h3 className="font-semibold text-base text-gray-900 leading-tight">
            {procedure.patient.name}
          </h3>
        </div>

        {/* Nome do procedimento - CENTRALIZADO */}
        <div className="bg-gray-100 rounded-lg px-4 py-3 mb-4">
          <p className="font-semibold text-sm text-gray-900 text-center leading-relaxed">
            {procedure.procedureName}
          </p>
        </div>

        {/* Barra de progresso do status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Progresso</span>
            <span className="text-xs font-semibold text-gray-700">
              {procedure.status}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                procedure.status === "Pendente"
                  ? "bg-yellow-500 w-1/5"
                  : procedure.status === "Enviada"
                    ? "bg-blue-500 w-2/5"
                    : procedure.status === "Aprovada"
                      ? "bg-green-500 w-3/5"
                      : procedure.status === "Recusada"
                        ? "bg-red-500 w-3/10"
                        : procedure.status === "Concluída"
                          ? "bg-green-600 w-full"
                          : "bg-gray-400 w-1/2"
              }`}
            />
          </div>
        </div>

        {/* Datas */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Criado em:</span>
            <span className="text-sm text-gray-600">{procedure.createdAt}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Prazo final:</span>
            <span className="text-sm text-gray-600">{procedure.deadline}</span>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200 my-3"></div>

        {/* Rodapé com médico e estatísticas */}
        <div className="flex items-center justify-between gap-2">
          {/* Médico/Gestor */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar
              name={procedure.doctor.name}
              src={procedure.doctor.avatarUrl}
              size="sm"
            />
            <span className="text-sm text-gray-700 truncate">
              {procedure.doctor.name}
            </span>
          </div>

          {/* Mensagens e anexos */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {procedure.messagesCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
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
