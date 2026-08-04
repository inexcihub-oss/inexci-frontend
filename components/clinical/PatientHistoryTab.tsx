"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui";
import {
  appointmentService,
  Appointment,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
} from "@/services/appointment.service";
import {
  clinicalRecordService,
  ClinicalRecord,
} from "@/services/clinical-record.service";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Stethoscope,
} from "lucide-react";

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-amber-50 text-amber-700",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

type Entry =
  | {
      kind: "appointment";
      id: string;
      at: number;
      appointment: Appointment;
      record: ClinicalRecord | null;
    }
  | { kind: "standalone"; id: string; at: number; record: ClinicalRecord }
  | {
      kind: "surgery";
      id: string;
      at: number;
      surgery: SurgeryRequestListItem;
    };

function surgeryAt(surgery: SurgeryRequestListItem): number {
  const raw = surgery.surgeryDate ?? surgery.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}

// `procedureName` já é um campo tipado (opcional) em `SurgeryRequestListItem`,
// assim como `tussProcedure` — nenhum cast é necessário aqui.
function surgeryName(surgery: SurgeryRequestListItem): string {
  return (
    surgery.procedureName ||
    surgery.procedure?.name ||
    surgery.tussProcedure?.description ||
    "Procedimento não especificado"
  );
}

/**
 * Histórico do paciente na tela de atendimento: consultas anteriores e
 * cirurgias em uma única linha do tempo decrescente. Expandir é inline (e a
 * cirurgia abre em nova aba) para o médico nunca perder a ficha em edição.
 * A consulta em curso não aparece — ela é a aba "Atendimento".
 */
export function PatientHistoryTab({
  patientId,
  currentAppointmentId,
}: {
  patientId: string;
  currentAppointmentId: string;
}) {
  const { can } = useAuth();
  const podeVerSolicitacoes = can(Permission.SOLICITACOES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [surgeries, setSurgeries] = useState<SurgeryRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [appts, recs, scs] = await Promise.all([
          appointmentService.getByPatient(patientId),
          clinicalRecordService.getByPatient(patientId),
          // Isolado do try/catch geral: se a busca de cirurgias falhar (ex.:
          // colaborador sem acesso a algum médico), a aba de Histórico não
          // pode cair inteira — só a seção de cirurgias fica vazia.
          surgeryRequestService.getAll({ patientId }).catch((err) => {
            logger.warn(
              "Erro ao carregar cirurgias do histórico do paciente:",
              err,
            );
            return { total: 0, records: [] as SurgeryRequestListItem[] };
          }),
        ]);
        if (!active) return;
        setAppointments(appts);
        setRecords(recs);
        setSurgeries(scs.records ?? []);
      } catch (err) {
        logger.error("Erro ao carregar histórico do paciente:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, reloadToken]);

  const entries = useMemo<Entry[]>(() => {
    const byAppointment = new Map<string, ClinicalRecord>();
    const standalone: ClinicalRecord[] = [];
    for (const record of records) {
      if (record.appointmentId) byAppointment.set(record.appointmentId, record);
      else standalone.push(record);
    }

    const merged: Entry[] = [
      ...appointments
        .filter((a) => a.id !== currentAppointmentId)
        .map((appointment) => ({
          kind: "appointment" as const,
          id: `appt-${appointment.id}`,
          at: new Date(appointment.scheduledAt).getTime(),
          appointment,
          record: byAppointment.get(appointment.id) ?? null,
        })),
      ...standalone.map((record) => ({
        kind: "standalone" as const,
        id: `rec-${record.id}`,
        at: new Date(record.createdAt).getTime(),
        record,
      })),
      ...surgeries.map((surgery) => ({
        kind: "surgery" as const,
        id: `sc-${surgery.id}`,
        at: surgeryAt(surgery),
        surgery,
      })),
    ];

    return merged.sort((a, b) => b.at - a.at);
  }, [appointments, records, surgeries, currentAppointmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-red-600">
          Não foi possível carregar o histórico do paciente.
        </p>
        <button
          onClick={() => setReloadToken((t) => t + 1)}
          className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px] px-3"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">
        Nenhuma consulta ou cirurgia anterior registrada para este paciente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const isOpen = openId === entry.id;
        const toggle = () => setOpenId(isOpen ? null : entry.id);

        if (entry.kind === "surgery") {
          const statusLabel =
            STATUS_NUMBER_TO_STRING[entry.surgery.status] ?? "Pendente";
          const colors = STATUS_COLORS[statusLabel] ?? {
            bg: "bg-gray-50",
            text: "text-gray-600",
          };
          const when = entry.surgery.surgeryDate ?? entry.surgery.createdAt;
          return (
            <EntryCard
              key={entry.id}
              isOpen={isOpen}
              onToggle={toggle}
              icon={<Stethoscope className="w-4 h-4 text-purple-600" />}
              iconClass="bg-purple-50"
              title={surgeryName(entry.surgery)}
              subtitle={`Cirurgia · ${when ? formatDate(when) : "—"}`}
              badge={
                <span
                  className={`text-xs px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}
                >
                  {statusLabel}
                </span>
              }
            >
              {podeVerSolicitacoes && (
                <a
                  href={`/solicitacao/${entry.surgery.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir solicitação
                </a>
              )}
            </EntryCard>
          );
        }

        if (entry.kind === "standalone") {
          return (
            <EntryCard
              key={entry.id}
              isOpen={isOpen}
              onToggle={toggle}
              icon={<CalendarDays className="w-4 h-4 text-teal-600" />}
              iconClass="bg-teal-50"
              title="Atendimento avulso"
              subtitle={`Sem consulta vinculada · ${formatDate(entry.record.createdAt)}`}
              badge={<RecordBadge record={entry.record} />}
            >
              <RecordDetails record={entry.record} />
            </EntryCard>
          );
        }

        const { appointment, record } = entry;
        return (
          <EntryCard
            key={entry.id}
            isOpen={isOpen}
            onToggle={toggle}
            icon={<CalendarDays className="w-4 h-4 text-blue-600" />}
            iconClass="bg-blue-50"
            title={APPOINTMENT_TYPE_LABELS[appointment.type]}
            subtitle={`Consulta · ${formatDate(appointment.scheduledAt)}`}
            badge={
              <span
                className={`text-xs px-2 py-1 rounded-lg ${STATUS_BADGE[appointment.status]}`}
              >
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
            }
          >
            {record ? (
              <RecordDetails record={record} />
            ) : (
              <p className="text-sm text-neutral-400">
                Sem anotações registradas nesta consulta.
              </p>
            )}
          </EntryCard>
        );
      })}
    </div>
  );
}

function EntryCard({
  isOpen,
  onToggle,
  icon,
  iconClass,
  title,
  subtitle,
  badge,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left min-h-[44px]"
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {title}
          </p>
          <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
        </div>
        {badge}
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 border-t border-neutral-100">
          {children}
        </div>
      )}
    </div>
  );
}

function RecordBadge({ record }: { record: ClinicalRecord }) {
  return record.finalizedAt ? (
    <span className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700">
      Finalizado
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
      Em aberto
    </span>
  );
}

function RecordDetails({ record }: { record: ClinicalRecord }) {
  return (
    <>
      <RecordBlock title="Anamnese" html={record.anamnesis} />
      <RecordBlock title="Exame físico" html={record.physicalExam} />
      <RecordBlock title="Diagnóstico" html={record.diagnosis} />
      {record.cidCodes && record.cidCodes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            CID-10
          </p>
          <div className="flex flex-wrap gap-1.5">
            {record.cidCodes.map((cid) => (
              <span
                key={cid.code}
                className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-0.5"
              >
                <strong>{cid.code}</strong> {cid.description}
              </span>
            ))}
          </div>
        </div>
      )}
      <RecordBlock title="Conduta" html={record.conduct} />
    </>
  );
}

function RecordBlock({
  title,
  html,
}: {
  title: string;
  html: string | null;
}) {
  if (!html) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
        {title}
      </p>
      <div
        className="prose prose-sm max-w-none text-sm text-neutral-800"
        // eslint-disable-next-line react/no-danger -- html sanitizado via sanitizeHtml (DOMPurify) antes de renderizar
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    </div>
  );
}
