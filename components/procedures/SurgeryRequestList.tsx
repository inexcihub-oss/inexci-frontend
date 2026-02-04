"use client";

import React, { useState, useMemo, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageCircle,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import {
  SurgeryRequest,
  SurgeryRequestStatus,
  PriorityLevel,
  PRIORITY_LABELS,
} from "@/types/surgery-request.types";
import { priorityColors, getPriorityLabel } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// Mapeamento de status para ícones
const STATUS_ICON_MAP: Record<SurgeryRequestStatus, string> = {
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

// Ordem dos status
const STATUS_ORDER: SurgeryRequestStatus[] = [
  "Pendente",
  "Enviada",
  "Em Análise",
  "Em Agendamento",
  "Agendada",
  "Realizada",
  "Faturada",
  "Finalizada",
  "Cancelada",
];

// Estilos de prioridade conforme Figma
const PRIORITY_STYLES: Record<PriorityLevel, { bg: string; text: string }> = {
  1: { bg: "bg-[#D4EFE0]", text: "text-[#1E6F47]" },
  2: { bg: "bg-[#EBF3FF]", text: "text-[#1D7AFC]" },
  3: { bg: "bg-[#FFF7D7]", text: "text-[#805F10]" },
  4: { bg: "bg-[#F0E6E4]", text: "text-[#601E17]" },
};

interface SurgeryRequestRowProps {
  request: SurgeryRequest;
  onClick?: (request: SurgeryRequest) => void;
}

/**
 * Componente de linha individual - Layout conforme Figma
 * Estrutura: Prioridade | Ícone Status | Paciente | Procedimento | Convênio | Pendências | Comentários | Anexos | Data | Menu
 */
const SurgeryRequestRow = memo<SurgeryRequestRowProps>(
  ({ request, onClick }) => {
    const router = useRouter();
    const priorityStyle = PRIORITY_STYLES[request.priority];

    const handleClick = () => {
      if (onClick) {
        onClick(request);
      } else {
        router.push(`/solicitacao/${request.id}`);
      }
    };

    const handleMenuClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // TODO: Abrir menu de ações
    };

    // Formatar protocolo para SC-XXXXXX
    const formattedId = request.protocol
      ? `SC-${request.protocol}`
      : "SC-000000";

    return (
      <div
        className="flex items-center h-11 py-1 bg-neutral-50 hover:bg-white cursor-pointer transition-colors"
        onClick={handleClick}
      >
        {/* Col 1: Tag Prioridade - alinhada com ícone do accordion (pl-4) */}
        <div className="flex items-center justify-start pl-4 pr-2 shrink-0">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
              priorityStyle.bg,
              priorityStyle.text,
            )}
          >
            {PRIORITY_LABELS[request.priority]}
          </span>
        </div>

        {/* Col 2: ID da Solicitação - padding 0 8px */}
        <div className="flex items-center px-2 shrink-0">
          <span className="text-xs text-neutral-200 whitespace-nowrap">
            {formattedId}
          </span>
        </div>

        {/* Col 3: Ícone Status + Nome Paciente - padding 0 8px, gap 4px, flex-1 */}
        <div className="flex items-center gap-1 px-2 min-w-0 flex-1">
          <Image
            src={STATUS_ICON_MAP[request.status]}
            alt={request.status}
            width={20}
            height={20}
            className="shrink-0 opacity-60"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(53%) sepia(9%) saturate(712%) hue-rotate(183deg) brightness(92%) contrast(88%)",
            }}
          />
          <span className="text-base font-semibold text-teal-700 hover:underline truncate">
            {request.patient.name}
          </span>
        </div>

        {/* Col 4: Procedimento - padding 0 8px, flex-1 */}
        <div className="flex items-center px-2 min-w-0 flex-1">
          <span className="text-base text-neutral-900 truncate">
            {request.procedureName}
          </span>
        </div>

        {/* Col 5: Convênio - width 140px, padding 0 8px */}
        <div className="flex items-center px-2 w-36 shrink-0">
          <span className="text-base text-neutral-900 truncate">
            {request.healthPlan || "-"}
          </span>
        </div>

        {/* Col 6: Badge Pendências - padding 0 4px */}
        <div className="flex items-center justify-center px-1 shrink-0">
          {request.pendenciesCount > 0 ? (
            <div className="flex items-center gap-1 px-3 py-1 border border-[#E34935] rounded-full bg-white">
              <AlertTriangle className="w-5 h-5 text-[#E34935]" />
              <span className="text-sm text-[#E34935]">
                {request.pendenciesCount}
              </span>
            </div>
          ) : (
            <div className="w-16" /> // Placeholder para manter alinhamento
          )}
        </div>

        {/* Col 7: Badge Comentários - padding 0 4px */}
        <div className="flex items-center justify-center px-1 shrink-0">
          <div className="flex items-center gap-1 px-3 py-1 border border-neutral-100 rounded-full bg-white">
            <MessageCircle className="w-5 h-5 text-neutral-200" />
            <span className="text-sm text-neutral-900">
              {request.messagesCount}
            </span>
          </div>
        </div>

        {/* Col 8: Badge Anexos - padding 0 4px */}
        <div className="flex items-center justify-center px-1 shrink-0">
          <div className="flex items-center gap-1 px-3 py-1 border border-neutral-100 rounded-full bg-white">
            <Paperclip className="w-5 h-5 text-neutral-200" />
            <span className="text-sm text-neutral-900">
              {request.attachmentsCount}
            </span>
          </div>
        </div>

        {/* Col 9: Data de Criação - formato DD/MM/YYYY */}
        <div className="flex items-center px-2 shrink-0">
          <span className="text-sm text-neutral-200 whitespace-nowrap">
            {request.createdAt}
          </span>
        </div>

        {/* Col 10: Botão Menu - padding 10px, height 44px */}
        <div className="flex items-center justify-center shrink-0">
          <button
            className="p-2.5 hover:bg-neutral-100 rounded transition-colors h-11"
            onClick={handleMenuClick}
          >
            <MoreHorizontal className="w-6 h-6 text-neutral-200" />
          </button>
        </div>
      </div>
    );
  },
);

SurgeryRequestRow.displayName = "SurgeryRequestRow";

interface StatusGroupProps {
  status: SurgeryRequestStatus;
  requests: SurgeryRequest[];
  defaultExpanded?: boolean;
  onRequestClick?: (request: SurgeryRequest) => void;
}

// Componente de grupo por status (Accordion)
const StatusGroup = memo<StatusGroupProps>(
  ({ status, requests, defaultExpanded = true, onRequestClick }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const statusIcon = STATUS_ICON_MAP[status];

    return (
      <div className="flex flex-col">
        {/* Header do Grupo */}
        <div
          className={cn(
            "flex items-center gap-2 py-3 pl-4 bg-white cursor-pointer",
            isExpanded
              ? "border-y border-neutral-100"
              : "border-t border-neutral-100",
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Botão Expand/Collapse */}
          <button className="p-2 hover:bg-neutral-50 rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-900" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-900" />
            )}
          </button>

          {/* Ícone do Status */}
          <Image
            src={statusIcon}
            alt={status}
            width={24}
            height={24}
            className="shrink-0"
          />

          {/* Nome do Status */}
          <span className="text-base font-semibold text-black">{status}</span>

          {/* Contador */}
          <div className="flex items-center justify-center w-6 h-6 bg-white border border-neutral-100 rounded-full">
            <span className="text-xs font-semibold text-neutral-900">
              {requests.length}
            </span>
          </div>
        </div>

        {/* Lista de Cards */}
        {isExpanded && requests.length > 0 && (
          <div className="flex flex-col">
            {requests.map((request) => (
              <SurgeryRequestRow
                key={request.id}
                request={request}
                onClick={onRequestClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

StatusGroup.displayName = "StatusGroup";

interface SurgeryRequestListProps {
  requests: SurgeryRequest[];
  onRequestClick?: (request: SurgeryRequest) => void;
}

export const SurgeryRequestList: React.FC<SurgeryRequestListProps> = ({
  requests,
  onRequestClick,
}) => {
  // Agrupar solicitações por status
  const groupedRequests = useMemo(() => {
    const groups: Record<SurgeryRequestStatus, SurgeryRequest[]> = {
      Pendente: [],
      Enviada: [],
      "Em Análise": [],
      "Em Agendamento": [],
      Agendada: [],
      Realizada: [],
      Faturada: [],
      Finalizada: [],
      Cancelada: [],
    };

    requests.forEach((request) => {
      if (groups[request.status]) {
        groups[request.status].push(request);
      }
    });

    return groups;
  }, [requests]);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto bg-white rounded-lg"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {STATUS_ORDER.map((status) => (
        <StatusGroup
          key={status}
          status={status}
          requests={groupedRequests[status]}
          defaultExpanded={groupedRequests[status].length > 0}
          onRequestClick={onRequestClick}
        />
      ))}

      {/* Estado vazio */}
      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-semibold text-neutral-900 mb-2">
            Nenhuma solicitação encontrada
          </p>
          <p className="text-sm text-neutral-200">
            Comece criando uma nova solicitação cirúrgica
          </p>
        </div>
      )}
    </div>
  );
};
