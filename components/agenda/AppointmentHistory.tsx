"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  MessageSquare,
  Pencil,
  Settings,
} from "lucide-react";
import {
  appointmentService,
  AppointmentActivity,
  AppointmentActivityType,
  APPOINTMENT_STATUS_LABELS,
} from "@/services/appointment.service";
import { getApiErrorMessage } from "@/lib/http-error";

export const appointmentActivitiesKey = (id: string) =>
  ["appointments", id, "activities"] as const;

const ICONE: Record<AppointmentActivityType, React.ReactNode> = {
  created: <CalendarPlus className="w-3.5 h-3.5" />,
  status_change: <ArrowRight className="w-3.5 h-3.5" />,
  rescheduled: <CalendarClock className="w-3.5 h-3.5" />,
  updated: <Pencil className="w-3.5 h-3.5" />,
  comment: <MessageSquare className="w-3.5 h-3.5" />,
  system: <Settings className="w-3.5 h-3.5" />,
};

const COMENTARIO_MAX = 1000;

function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/** Frase principal de cada linha. */
function titulo(a: AppointmentActivity): string {
  switch (a.type) {
    case "created":
      return "Consulta agendada";
    case "status_change":
      return a.toStatus
        ? `${a.fromStatus ? `${APPOINTMENT_STATUS_LABELS[a.fromStatus]} → ` : ""}${APPOINTMENT_STATUS_LABELS[a.toStatus]}`
        : "Status alterado";
    case "rescheduled":
      return "Remarcada";
    case "updated":
      return "Consulta alterada";
    case "comment":
      return "Comentário";
    default:
      return "Sistema";
  }
}

/**
 * Linha do tempo da consulta (agendada, confirmada, chegou, remarcada,
 * cancelada, comentários). Só monta quando o usuário abre a seção, para a
 * agenda não pagar uma requisição por consulta.
 */
export function AppointmentHistory({
  appointmentId,
  podeComentar,
}: {
  appointmentId: string;
  podeComentar: boolean;
}) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const { data: atividades = [], isLoading, isError } = useQuery({
    queryKey: appointmentActivitiesKey(appointmentId),
    queryFn: () => appointmentService.listActivities(appointmentId),
    // Mudança de status/edição acontece fora daqui e não invalida esta
    // chave: abrir a seção sempre busca de novo, senão o histórico mostrava
    // a versão em cache sem a última mudança.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const comentar = useMutation({
    mutationFn: (conteudo: string) =>
      appointmentService.addComment(appointmentId, conteudo),
    onSuccess: () => {
      setTexto("");
      setErro(null);
      return queryClient.invalidateQueries({
        queryKey: appointmentActivitiesKey(appointmentId),
      });
    },
    onError: (err) =>
      setErro(getApiErrorMessage(err, "Não foi possível comentar.")),
  });

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-xs text-neutral-400">Carregando histórico...</p>
      ) : isError ? (
        <p className="text-xs text-red-600">Não foi possível carregar o histórico.</p>
      ) : atividades.length === 0 ? (
        <p className="text-xs text-neutral-500">Nada registrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {atividades.map((a) => (
            <li key={a.id} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                {ICONE[a.type] ?? ICONE.system}
              </span>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-neutral-800">{titulo(a)}</p>
                {a.content && (
                  <p className="text-neutral-600 break-words">{a.content}</p>
                )}
                <p className="text-neutral-400">
                  {quando(a.createdAt)}
                  {a.user ? ` · ${a.user.name}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {podeComentar && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const conteudo = texto.trim();
            if (conteudo) comentar.mutate(conteudo);
          }}
        >
          <textarea
            aria-label="Comentário"
            className="ds-input min-h-[64px] text-sm"
            placeholder="Ex.: paciente pediu para ligar antes"
            maxLength={COMENTARIO_MAX}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            {erro ? (
              <p role="alert" className="text-xs text-red-600">
                {erro}
              </p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={!texto.trim() || comentar.isPending}
              className="min-h-[36px] px-3 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              Comentar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
