"use client";

import React, { memo, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Send,
  Edit,
  X,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  SurgeryRequest,
  PriorityLevel,
  SurgeryRequestStatus,
} from "@/types/surgery-request.types";
import { useToggle, useClickOutside } from "@/hooks";
import { priorityColors } from "@/lib/design-system";

interface ProcedureCardProps {
  procedure: SurgeryRequest;
  isDragging?: boolean;
}

// Estilos de prioridade do Design System
const priorityStyles: Record<PriorityLevel, { bg: string; text: string }> = {
  Baixa: {
    bg: priorityColors.Baixa.bgClass,
    text: priorityColors.Baixa.textClass,
  },
  Média: {
    bg: priorityColors.Média.bgClass,
    text: priorityColors.Média.textClass,
  },
  Alta: {
    bg: priorityColors.Alta.bgClass,
    text: priorityColors.Alta.textClass,
  },
  Urgente: {
    bg: priorityColors.Urgente.bgClass,
    text: priorityColors.Urgente.textClass,
  },
};

// Mapeamento de status para ícone SVG
const statusIconMap: Record<SurgeryRequestStatus, string> = {
  Pendente: "/icons/kanban/clock-watch.svg",
  Enviada: "/icons/kanban/email-send-fast-circle.svg",
  "Em Análise": "/icons/kanban/loading-waiting.svg",
  "Em Agendamento": "/icons/kanban/calendar-chedule-clock.svg",
  Agendada: "/icons/kanban/calendar-schedule-checkmark.svg",
  Realizada: "/icons/kanban/hospital-board-square.svg",
  Faturada: "/icons/kanban/coins.svg",
  Finalizada: "/icons/kanban/checkmark-circle-1.svg",
  Cancelada: "/icons/kanban/Delete, Disabled.svg",
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
      return [
        { icon: CheckCircle, label: "Aprovar", color: "text-green-600" },
        { icon: X, label: "Negar", color: "text-red-600" },
      ];
    case "Em Agendamento":
      return [
        { icon: Calendar, label: "Agendar", color: "text-green-600" },
        { icon: AlertCircle, label: "Contestar", color: "text-orange-600" },
      ];
    case "Agendada":
      return [
        {
          icon: CheckCircle,
          label: "Marcar Realizada",
          color: "text-green-600",
        },
      ];
    case "Realizada":
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
    const statusIcon = statusIconMap[procedure.status];

    useClickOutside(dropdownRef, closeActions, showActions);

    const handleActionClick = useCallback(
      (action: string) => {
        closeActions();
      },
      [closeActions],
    );

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          return;
        }
        router.push(`/solicitacao/${procedure.id}`);
      },
      [router, procedure.id],
    );

    const handleMenuClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleActions();
      },
      [toggleActions],
    );

    // Formatar ID para SOL-XXXXXX (6 dígitos)
    const formattedId = `SOL-${String(procedure.id).padStart(6, "0")}`;

    return (
      <div
        onClick={handleCardClick}
        className={`relative bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-md ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        {/* Botão Menu - 3 pontos horizontais */}
        <div className="absolute top-3 right-3" ref={dropdownRef}>
          <button
            onClick={handleMenuClick}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>

          {/* Dropdown de ações contextuais */}
          {showActions && contextualActions.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40">
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

        {/* ID da Solicitação */}
        <span className="text-xs text-gray-500 leading-tight block mb-2">
          {formattedId}
        </span>

        {/* Ícone de Status + Nome do Paciente */}
        <div className="flex items-center gap-2 mb-1 pr-8">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src={statusIcon}
              alt={procedure.status}
              width={20}
              height={20}
              className="flex-shrink-0"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(54%) sepia(7%) saturate(943%) hue-rotate(182deg) brightness(93%) contrast(89%)",
              }}
            />
          </div>
          <h3 className="font-semibold text-base text-teal-700 leading-normal line-clamp-1">
            {procedure.patient.name}
          </h3>
        </div>

        {/* Procedimento */}
        <p className="text-base text-gray-900 leading-normal line-clamp-2 mb-6">
          {procedure.procedureName}
        </p>

        {/* Nome do Médico/Gestor */}
        <p
          className={`text-base text-gray-500 leading-normal line-clamp-1 ${procedure.healthPlan ? "mb-1" : "mb-3"}`}
        >
          {procedure.doctor.name}
        </p>

        {/* Convênio - sempre abaixo do gestor se existir */}
        {procedure.healthPlan && (
          <p className="text-base text-gray-500 leading-normal line-clamp-1 mb-3">
            {procedure.healthPlan}
          </p>
        )}

        {/* Tags: Prioridade + Pendências */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Tag Prioridade */}
          <span
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded"
            style={{
              backgroundColor: priorityColors[procedure.priority].bg,
              color: priorityColors[procedure.priority].text,
            }}
          >
            {procedure.priority}
          </span>

          {/* Badge Pendências ao lado da prioridade */}
          {procedure.pendenciesCount && procedure.pendenciesCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded"
              style={{ backgroundColor: "#F0E6E4", color: "#E34935" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  d="M8 5.5V8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11V11.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M2 13L8 2L14 13H2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              {procedure.pendenciesCount}
            </span>
          ) : (
            procedure.status !== "Finalizada" &&
            procedure.status !== "Cancelada" && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded"
                style={{ backgroundColor: "#E6F4EA", color: "#137333" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <path
                    d="M13.3333 4L6 11.3333L2.66666 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Pode avançar
              </span>
            )
          )}
        </div>

        {/* Rodapé - Data, Chat e Anexos */}
        <div className="flex items-center justify-between">
          {/* Data de Criação - Esquerda */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 flex items-center justify-center">
              <Image
                src="/icons/calendar-schedule.svg"
                alt="Data de criação"
                width={20}
                height={20}
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(54%) sepia(7%) saturate(943%) hue-rotate(182deg) brightness(93%) contrast(89%)",
                }}
              />
            </div>
            <span
              className="text-xs font-normal"
              style={{ color: "rgba(117, 129, 149, 1)" }}
            >
              {procedure.createdAt}
            </span>
          </div>

          {/* Chat e Anexos - Direita */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Image src="/icons/chat.svg" alt="Chat" width={16} height={16} />
              <span className="text-sm text-gray-500">
                {procedure.messagesCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Image
                src="/icons/attachment.svg"
                alt="Anexos"
                width={16}
                height={16}
              />
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
