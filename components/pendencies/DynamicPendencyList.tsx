"use client";

import { cn } from "@/lib/utils";
import { CalculatedPendency } from "@/services/pendency.service";
import {
  Check,
  Clock,
  AlertCircle,
  Circle,
  ChevronDown,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";

interface DynamicPendencyListProps {
  pendencies: CalculatedPendency[] | undefined | null;
  statusLabel: string;
  canAdvance: boolean;
  completedCount: number;
  pendingCount: number;
  totalCount: number;
  currentStatus?: number;
  compact?: boolean;
  className?: string;
  onPendencyClick?: (key: string) => void;
}

interface NextStepGuide {
  name: string;
  description: string;
  steps: string[];
}

const NEXT_STEP_GUIDES: Record<number, NextStepGuide> = {
  1: {
    name: "Solicitação pronta para envio",
    description:
      "Todos os requisitos foram preenchidos com sucesso. Envie a solicitação para a operadora de saúde para iniciar a análise.",
    steps: [
      'Clique no botão "Enviar Solicitação" no cabeçalho da página',
      "Escolha o método de envio: Download Manual ou Envio por E-mail",
      "Se optar por e-mail, preencha destinatário, assunto e mensagem",
      "Opcionalmente, salve a solicitação como modelo para uso futuro",
      'O status será atualizado automaticamente para "Enviada"',
    ],
  },
  2: {
    name: "Aguardando protocolo da operadora",
    description:
      "A solicitação foi enviada à operadora de saúde. Registre o recebimento assim que ela confirmar o protocolo.",
    steps: [
      "Aguarde o retorno da operadora com o número de protocolo",
      'Clique em "Registrar em Análise" quando receber a confirmação',
      "Preencha o número da solicitação e a data de recebimento (obrigatórios)",
      "Informe os números de cotação (cotação 1, 2 ou 3) caso existam",
      'O status mudará para "Em Análise" após o registro',
    ],
  },
  3: {
    name: "Aguardando retorno das autorizações",
    description:
      "A operadora está analisando a solicitação. Quando receber a resposta com as autorizações, registre os resultados no sistema.",
    steps: [
      "Aguarde o retorno da operadora com os resultados das autorizações",
      'Clique em "Atualizar Autorizações" assim que tiver os resultados',
      "Informe a quantidade autorizada para cada código TUSS solicitado",
      "Informe a quantidade autorizada para cada item de OPME",
      "Se tudo autorizado: aceite e informe 3 opções de data para a cirurgia",
      "Se houver negativas ou parciais: conteste ou encerre a solicitação",
    ],
  },
  4: {
    name: "Aguardando confirmação da data da cirurgia",
    description:
      "As opções de data foram definidas e estão aguardando confirmação. O paciente pode confirmar, ou você pode selecionar diretamente.",
    steps: [
      'Acesse a aba "Informações Gerais" para ver as opções de data disponíveis',
      "O paciente pode confirmar a data de preferência diretamente",
      "Ou selecione uma das datas e clique no botão de confirmar",
      "Para alterar as opções de data, use o botão Editar na seção de Agendamento",
      'Após a confirmação, o status mudará automaticamente para "Agendada"',
    ],
  },
  5: {
    name: "Aguardando realização da cirurgia",
    description:
      "A cirurgia está agendada. Após a realização, atualize o status para registrar o resultado e avançar o processo.",
    steps: [
      'Após a cirurgia, clique em "Status da Cirurgia" no topo da página',
      'Selecione "Realizada" e anexe os documentos pós-cirúrgicos',
      "Documentos obrigatórios: Descrição Cirúrgica (Folha de Sala), Imagens e Documento de Autorização",
      "Documentos adicionais podem ser anexados como Outros (opcional)",
      'Para reagendar: clique em "Reagendar" e defina uma nova data',
      'Para cancelar: selecione "Cancelada" — o status irá para "Encerrada"',
    ],
  },
  6: {
    name: "Cirurgia realizada — fature a solicitação",
    description:
      "A cirurgia foi realizada com sucesso. Prossiga com o faturamento para dar início ao processo de recebimento do pagamento.",
    steps: [
      'Clique em "Faturar Solicitação" no cabeçalho da página',
      "Preencha o número de protocolo do faturamento",
      "Informe a data de envio do faturamento à operadora",
      "Informe o valor faturado e o prazo esperado para recebimento",
      "Opcionalmente, defina esse prazo como padrão para o convênio",
      'O status mudará para "Faturada" ao concluir',
    ],
  },
  7: {
    name: "Aguardando recebimento do pagamento",
    description:
      "O faturamento foi enviado à operadora. Confirme o recebimento quando o pagamento for processado.",
    steps: [
      "Aguarde o pagamento da operadora de saúde dentro do prazo definido",
      'Clique em "Confirmar Recebimento" quando receber o pagamento',
      "Informe o valor recebido e a data de recebimento",
      "Se o valor for igual ao esperado, confirme diretamente",
      'Se houver divergência no valor, use "Confirmar e Recorrer" para contestar',
      'O status mudará para "Finalizada" após a confirmação',
    ],
  },
  8: {
    name: "Solicitação finalizada com sucesso",
    description:
      "O ciclo desta solicitação cirúrgica foi concluído com êxito. Todos os dados estão disponíveis para consulta.",
    steps: [
      'Confira os dados de faturamento e recebimento na aba "Faturamento"',
      "Se o valor recebido foi contestado, acompanhe a resolução com a operadora",
      "Você pode editar os dados de recebimento se necessário na aba Faturamento",
      'Para arquivar a solicitação, utilize o botão "Encerrar"',
    ],
  },
  9: {
    name: "Solicitação arquivada",
    description:
      "Esta solicitação foi encerrada e está disponível apenas para consulta histórica. Nenhuma ação está disponível.",
    steps: [
      "Consulte o histórico completo nas abas disponíveis",
      "Todos os dados de faturamento e recebimento estão na aba Faturamento",
      "Não há ações pendentes para esta solicitação",
    ],
  },
};

export function DynamicPendencyList({
  pendencies,
  statusLabel,
  canAdvance,
  completedCount,
  pendingCount,
  totalCount,
  currentStatus,
  compact = false,
  className,
  onPendencyClick,
}: DynamicPendencyListProps) {
  // Filtra itens opcionais que já estão completos — não há nada a exibir para eles.
  // Ex: 'contest_pending' aparece como completo quando não há contestação ativa;
  // só deve ser exibido quando há contestação pendente (isOptional && !isComplete).
  const displayPendencies = (pendencies ?? []).filter(
    (p) => !(p.isOptional && p.isComplete),
  );

  const displayTotal = displayPendencies.length;
  const displayCompleted = displayPendencies.filter((p) => p.isComplete).length;
  const progress =
    displayTotal > 0 ? (displayCompleted / displayTotal) * 100 : 100;

  if (displayPendencies.length === 0) {
    const guide = currentStatus ? NEXT_STEP_GUIDES[currentStatus] : undefined;
    return (
      <div className={cn("space-y-3", className)}>
        {/* Ícone de tudo em ordem */}
        <div className="flex flex-col items-center py-4 gap-1.5">
          <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
            <Check className="h-5 w-5 text-teal-600" />
          </div>
          <p className="text-xs font-medium text-teal-700">Nenhuma pendência</p>
        </div>

        {/* Card de próximo passo */}
        {guide && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 overflow-hidden">
            {/* Header do card */}
            <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-teal-800 leading-snug">
                  {guide.name}
                </p>
                <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">
                  {guide.description}
                </p>
              </div>
            </div>

            {/* Separador */}
            <div className="mx-3 border-t border-teal-200" />

            {/* Passos */}
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-2">
                O que fazer agora
              </p>
              {guide.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center text-[9px] font-bold text-teal-700 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-teal-800 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 md:space-y-4", className)}>
      {/* Header com resumo */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs md:text-sm">
          <span className="font-medium text-gray-700">
            Status: {statusLabel}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              canAdvance
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {canAdvance ? "Pode avançar" : `${pendingCount} pendente(s)`}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              canAdvance ? "bg-green-500" : "bg-teal-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 text-center">
          {displayCompleted} de {displayTotal} concluídas
        </div>
      </div>

      {/* Lista de pendências */}
      <div className={cn(compact ? "space-y-1" : "space-y-2")}>
        {displayPendencies.map((pendency) => (
          <DynamicPendencyItem
            key={pendency.key}
            pendency={pendency}
            compact={compact}
            onNavigate={onPendencyClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DynamicPendencyItemProps {
  pendency: CalculatedPendency;
  compact?: boolean;
  onNavigate?: (key: string) => void;
}

function DynamicPendencyItem({
  pendency,
  compact = false,
  onNavigate,
}: DynamicPendencyItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasCheckItems = pendency.checkItems && pendency.checkItems.length > 0;
  const isClickable = hasCheckItems && !pendency.isComplete;
  const isNavigable =
    !pendency.isComplete && !pendency.isWaiting && !!onNavigate;

  const getStatusIcon = () => {
    if (pendency.isComplete)
      return <Check className="h-4 w-4 text-green-600 flex-shrink-0" />;
    if (pendency.isWaiting)
      return <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    if (pendency.isOptional)
      return <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    return <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        pendency.isComplete
          ? "bg-green-50 border-green-200"
          : pendency.isWaiting
            ? "bg-blue-50 border-blue-200"
            : pendency.isOptional
              ? "bg-blue-50 border-blue-200"
              : "bg-amber-50 border-amber-200",
      )}
    >
      {/* Linha principal */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 min-h-[44px]",
          compact && "py-2",
          (isClickable || isNavigable) && "cursor-pointer select-none",
        )}
        onClick={() => {
          if (isClickable) setExpanded((v) => !v);
          if (isNavigable) onNavigate?.(pendency.key);
        }}
      >
        {getStatusIcon()}

        <span
          className={cn(
            "flex-1 text-xs md:text-sm font-semibold leading-tight",
            pendency.isComplete
              ? "text-green-700"
              : pendency.isOptional
                ? "text-blue-700"
                : "text-gray-900",
          )}
        >
          {pendency.name}
          {pendency.isOptional && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              (opcional)
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {pendency.isComplete ? (
            <span className="text-xs text-green-600 font-semibold">
              Completo
            </span>
          ) : pendency.isWaiting ? (
            <span className="text-xs text-blue-600 font-semibold">
              Aguardando
            </span>
          ) : pendency.isOptional ? (
            <span className="text-xs text-blue-600 font-semibold">
              Lembrete
            </span>
          ) : (
            <span className="text-xs text-amber-600 font-semibold">
              Pendente
            </span>
          )}
          {isClickable && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform",
                expanded && "rotate-180",
              )}
            />
          )}
          {isNavigable && !isClickable && (
            <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
      </div>

      {/* Sub-itens expandidos */}
      {expanded && hasCheckItems && (
        <div
          className={cn(
            "mx-3 mb-2.5 rounded-xl overflow-hidden border",
            pendency.isOptional ? "border-gray-200" : "border-amber-200",
          )}
        >
          {pendency.checkItems!.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm",
                i > 0 && "border-t border-amber-100",
                item.done ? "bg-green-50" : "bg-white",
              )}
            >
              {item.done ? (
                <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs leading-snug",
                  item.done
                    ? "text-green-700 line-through decoration-green-400"
                    : "text-gray-700",
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
