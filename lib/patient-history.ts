import {
  Appointment,
  AppointmentStatus,
  APPOINTMENT_STATUS_LABELS,
} from "@/services/appointment.service";
import { ClinicalRecord } from "@/services/clinical-record.service";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

/**
 * Linha do tempo do paciente: consulta e ficha viram um item só, para a mesma
 * visita não aparecer duas vezes (uma como consulta, outra como prontuário).
 */
export type HistoricoItem =
  | {
      kind: "consulta";
      id: string;
      at: number;
      appointment: Appointment;
      record: ClinicalRecord | null;
    }
  | { kind: "ficha"; id: string; at: number; record: ClinicalRecord }
  | {
      kind: "cirurgia";
      id: string;
      at: number;
      surgery: SurgeryRequestListItem;
    };

export interface Historico {
  /** Consultas de hoje em diante ainda em aberto, da mais próxima à mais distante. */
  proximas: Appointment[];
  /** Todo o resto, do mais recente ao mais antigo. */
  itens: HistoricoItem[];
}

const EM_ABERTO: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "waiting",
  "in_progress",
];

/** Dia civil em São Paulo (`AAAA-MM-DD`), que é o que "hoje" quer dizer na clínica. */
export function diaEmSaoPaulo(value: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function surgeryAt(surgery: SurgeryRequestListItem): number {
  const raw = surgery.surgeryDate ?? surgery.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}

/**
 * Liga cada ficha à sua consulta. Quando a ficha não traz `appointmentId`
 * (prontuário migrado, ou ficha aberta fora da agenda), casa com a consulta do
 * mesmo profissional no mesmo dia que ainda não tem ficha — a de horário mais
 * próximo.
 */
function ligarFichas(
  appointments: Appointment[],
  records: ClinicalRecord[],
): { porConsulta: Map<string, ClinicalRecord>; avulsas: ClinicalRecord[] } {
  const porConsulta = new Map<string, ClinicalRecord>();
  const semVinculo: ClinicalRecord[] = [];
  const consultas = new Set(appointments.map((a) => a.id));

  for (const record of records) {
    if (
      record.appointmentId &&
      consultas.has(record.appointmentId) &&
      !porConsulta.has(record.appointmentId)
    ) {
      porConsulta.set(record.appointmentId, record);
    } else {
      semVinculo.push(record);
    }
  }

  const avulsas: ClinicalRecord[] = [];
  for (const record of semVinculo) {
    const dia = diaEmSaoPaulo(record.createdAt);
    const alvo = new Date(record.createdAt).getTime();
    const candidata = appointments
      .filter(
        (a) =>
          !porConsulta.has(a.id) &&
          a.status !== "cancelled" &&
          a.doctorId === record.doctorId &&
          diaEmSaoPaulo(a.scheduledAt) === dia,
      )
      .sort(
        (a, b) =>
          Math.abs(new Date(a.scheduledAt).getTime() - alvo) -
          Math.abs(new Date(b.scheduledAt).getTime() - alvo),
      )[0];
    if (candidata) porConsulta.set(candidata.id, record);
    else avulsas.push(record);
  }

  return { porConsulta, avulsas };
}

export function montarHistorico({
  appointments,
  records,
  surgeries,
  agora = new Date(),
  excluirConsultaId,
}: {
  appointments: Appointment[];
  records: ClinicalRecord[];
  surgeries: SurgeryRequestListItem[];
  agora?: Date;
  /** Consulta em curso na tela de atendimento — ela é a própria aba. */
  excluirConsultaId?: string;
}): Historico {
  const visiveis = appointments.filter((a) => a.id !== excluirConsultaId);
  const { porConsulta, avulsas } = ligarFichas(
    visiveis,
    records.filter(
      (r) => !excluirConsultaId || r.appointmentId !== excluirConsultaId,
    ),
  );
  const hoje = diaEmSaoPaulo(agora);

  const proximas: Appointment[] = [];
  const itens: HistoricoItem[] = [];

  for (const appointment of visiveis) {
    const record = porConsulta.get(appointment.id) ?? null;
    const futura =
      EM_ABERTO.includes(appointment.status) &&
      !record &&
      diaEmSaoPaulo(appointment.scheduledAt) >= hoje;
    if (futura) {
      proximas.push(appointment);
      continue;
    }
    itens.push({
      kind: "consulta",
      id: `consulta-${appointment.id}`,
      at: new Date(appointment.scheduledAt).getTime(),
      appointment,
      record,
    });
  }

  for (const record of avulsas) {
    itens.push({
      kind: "ficha",
      id: `ficha-${record.id}`,
      at: new Date(record.createdAt).getTime(),
      record,
    });
  }

  for (const surgery of surgeries) {
    itens.push({
      kind: "cirurgia",
      id: `cirurgia-${surgery.id}`,
      at: surgeryAt(surgery),
      surgery,
    });
  }

  proximas.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  itens.sort((a, b) => b.at - a.at);
  return { proximas, itens };
}

export type SituacaoTom =
  | "azul"
  | "indigo"
  | "laranja"
  | "ciano"
  | "verde"
  | "vermelho"
  | "ambar"
  | "cinza";

const TOM_DO_STATUS: Record<AppointmentStatus, SituacaoTom> = {
  scheduled: "azul",
  confirmed: "indigo",
  waiting: "laranja",
  in_progress: "ciano",
  completed: "verde",
  cancelled: "vermelho",
  no_show: "ambar",
};

/**
 * Status mostrado na linha do tempo. Consulta de um dia que já passou e que
 * ficou "Agendada", "Confirmada", "Aguardando" ou "Em atendimento" não está
 * pendente de nada — ninguém fechou o status. Com ficha, foi realizada; sem
 * ficha, não há registro do que aconteceu.
 */
export function situacaoConsulta(
  appointment: Pick<Appointment, "status" | "scheduledAt">,
  temFicha: boolean,
  agora: Date = new Date(),
): { label: string; tom: SituacaoTom } {
  const passou =
    diaEmSaoPaulo(appointment.scheduledAt) < diaEmSaoPaulo(agora);
  if (passou && EM_ABERTO.includes(appointment.status)) {
    return temFicha
      ? { label: APPOINTMENT_STATUS_LABELS.completed, tom: "verde" }
      : { label: "Sem registro", tom: "cinza" };
  }
  return {
    label: APPOINTMENT_STATUS_LABELS[appointment.status],
    tom: TOM_DO_STATUS[appointment.status],
  };
}

export function textoDeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Uma linha que diz do que foi a visita. Diagnóstico e conduta resumem melhor
 * que a anamnese, que costuma começar com a queixa ou um cabeçalho repetido.
 */
export function resumoDaFicha(record: ClinicalRecord): string {
  return (
    textoDeHtml(record.diagnosis) ||
    textoDeHtml(record.conduct) ||
    textoDeHtml(record.anamnesis) ||
    textoDeHtml(record.physicalExam)
  );
}

/** Idade em anos completos; `null` se a data não vier ou for inválida. */
export function idadeEmAnos(
  birthDate: string | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return null;
  const [ano, mes, dia] = match.slice(1).map(Number);
  const [hAno, hMes, hDia] = diaEmSaoPaulo(agora).split("-").map(Number);
  let idade = hAno - ano;
  if (hMes < mes || (hMes === mes && hDia < dia)) idade -= 1;
  return idade >= 0 && idade < 150 ? idade : null;
}

/** Última visita que de fato aconteceu (realizada ou com ficha). */
export function ultimaVisita(historico: Historico): number | null {
  for (const item of historico.itens) {
    if (item.kind === "ficha") return item.at;
    if (
      item.kind === "consulta" &&
      (item.record || item.appointment.status === "completed")
    ) {
      return item.at;
    }
  }
  return null;
}
