"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileText,
  Paperclip,
  Stethoscope,
} from "lucide-react";
import {
  Appointment,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import { ClinicalRecord } from "@/services/clinical-record.service";
import {
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { PatientDocument } from "@/services/document.service";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";
import { AppointmentHistory } from "@/components/agenda/AppointmentHistory";
import {
  Historico,
  HistoricoItem,
  resumoDaFicha,
  situacaoConsulta,
  SituacaoTom,
} from "@/lib/patient-history";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { capitalizeFirst } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { safeExternalUrl } from "@/lib/safe-url";

const POR_PAGINA = 20;

const TOM_CLASSE: Record<SituacaoTom, string> = {
  azul: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700",
  laranja: "bg-orange-50 text-orange-700",
  ciano: "bg-cyan-50 text-cyan-800",
  verde: "bg-green-50 text-green-700",
  vermelho: "bg-red-50 text-red-600",
  ambar: "bg-amber-50 text-amber-700",
  cinza: "bg-neutral-100 text-neutral-600",
};

/** Documentos que o próprio atendimento emite ganham selo com nome. */
const SELO_DOCUMENTO: Record<string, string> = {
  prescription: "Receita",
  medical_certificate: "Atestado",
  exam_referral: "Pedido de exames",
};

type Filtro = "todos" | "consultas" | "cirurgias";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "consultas", label: "Consultas" },
  { id: "cirurgias", label: "Cirurgias" },
];

function dataCurta(value: string | number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function hora(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function diaDaSemana(value: string): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      timeZone: "America/Sao_Paulo",
    })
      .format(new Date(value))
      .replace(".", ""),
  );
}

function nomeDaCirurgia(surgery: SurgeryRequestListItem): string {
  return (
    surgery.procedureName ||
    surgery.procedure?.name ||
    surgery.tussProcedure?.description ||
    "Procedimento não especificado"
  );
}

function profissionalDo(item: HistoricoItem): string | null {
  if (item.kind === "consulta") return item.appointment.doctorId;
  if (item.kind === "ficha") return item.record.doctorId;
  return null;
}

/**
 * Linha do tempo do paciente: uma visita por cartão (consulta + ficha juntas),
 * cirurgias no meio, do mais recente ao mais antigo. Usada na página do
 * paciente e na aba "Histórico" do atendimento.
 */
export function PatientTimeline({
  historico,
  documents,
  profissionais,
  podeVerSolicitacoes,
  onAbrirConsulta,
  cirurgiaEmNovaAba = false,
  mensagemVazia = "Nenhuma consulta ou cirurgia registrada para este paciente.",
  mostrarProximas = true,
}: {
  historico: Historico;
  documents: PatientDocument[];
  profissionais: Map<string, string>;
  podeVerSolicitacoes: boolean;
  /** Sem ele, a consulta não tem ação (ex.: dentro do atendimento). */
  onAbrirConsulta?: (appointment: Appointment) => void;
  /** No atendimento, abrir a cirurgia não pode tirar o médico da ficha. */
  cirurgiaEmNovaAba?: boolean;
  mensagemVazia?: string;
  /** Na página do paciente as próximas vivem na barra lateral. */
  mostrarProximas?: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [profissionaisFiltro, setProfissionaisFiltro] = useState<string[]>(
    [],
  );
  const [limite, setLimite] = useState(POR_PAGINA);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const documentosPorFicha = useMemo(() => {
    const mapa = new Map<string, PatientDocument[]>();
    for (const doc of documents) {
      if (!doc.clinicalRecordId) continue;
      const lista = mapa.get(doc.clinicalRecordId) ?? [];
      lista.push(doc);
      mapa.set(doc.clinicalRecordId, lista);
    }
    return mapa;
  }, [documents]);

  // Mesmo filtro da Agenda: só aparece com mais de um profissional no
  // histórico, e a contagem é de visitas deste paciente com cada um.
  const { opcoesProfissional, visitasPorProfissional } = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const item of historico.itens) {
      const id = profissionalDo(item);
      if (id && profissionais.has(id)) contagem[id] = (contagem[id] ?? 0) + 1;
    }
    return {
      opcoesProfissional: Object.keys(contagem).map((id) => ({
        id,
        name: profissionais.get(id)!,
        crm: null,
        crmState: null,
      })),
      visitasPorProfissional: contagem,
    };
  }, [historico.itens, profissionais]);

  const temCirurgia = historico.itens.some((i) => i.kind === "cirurgia");

  const filtrados = useMemo(
    () =>
      historico.itens.filter((item) => {
        if (filtro === "consultas" && item.kind === "cirurgia") return false;
        if (filtro === "cirurgias" && item.kind !== "cirurgia") return false;
        if (
          profissionaisFiltro.length > 0 &&
          !profissionaisFiltro.includes(profissionalDo(item) ?? "")
        ) {
          return false;
        }
        return true;
      }),
    [historico.itens, filtro, profissionaisFiltro],
  );

  const visiveis = filtrados.slice(0, limite);

  return (
    <div className="flex flex-col gap-4">
      {mostrarProximas && historico.proximas.length > 0 && (
        <ProximasConsultas
          proximas={historico.proximas}
          profissionais={profissionais}
          onAbrirConsulta={onAbrirConsulta}
        />
      )}

      {historico.itens.length === 0 ? (
        (!mostrarProximas || historico.proximas.length === 0) && (
          <p className="text-sm text-gray-400 py-4">{mensagemVazia}</p>
        )
      ) : (
        <section className="flex flex-col gap-3" aria-label="Histórico">
          {(temCirurgia || opcoesProfissional.length > 1) && (
            <div className="flex flex-wrap items-center gap-2">
              {temCirurgia &&
                FILTROS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filtro === f.id}
                    onClick={() => {
                      setFiltro(f.id);
                      setLimite(POR_PAGINA);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold border transition-colors",
                      filtro === f.id
                        ? "bg-teal-700 border-teal-700 text-white"
                        : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              <div className="sm:ml-auto max-w-full">
                <AgendaDoctorFilter
                  doctors={opcoesProfissional}
                  selectedDoctorIds={profissionaisFiltro}
                  onChange={(ids) => {
                    setProfissionaisFiltro(ids);
                    setLimite(POR_PAGINA);
                  }}
                  countByDoctorId={visitasPorProfissional}
                  align="end"
                />
              </div>
            </div>
          )}

          {visiveis.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">
              Nada encontrado com esse filtro.
            </p>
          ) : (
            visiveis.map((item) => (
              <ItemDoHistorico
                key={item.id}
                item={item}
                aberto={abertoId === item.id}
                onToggle={() =>
                  setAbertoId(abertoId === item.id ? null : item.id)
                }
                profissionais={profissionais}
                documentosPorFicha={documentosPorFicha}
                podeVerSolicitacoes={podeVerSolicitacoes}
                onAbrirConsulta={onAbrirConsulta}
                cirurgiaEmNovaAba={cirurgiaEmNovaAba}
              />
            ))
          )}

          {filtrados.length > limite && (
            <button
              type="button"
              onClick={() => setLimite((l) => l + POR_PAGINA)}
              className="self-center min-h-[44px] px-4 text-sm font-semibold text-teal-700 hover:underline"
            >
              Mostrar mais ({filtrados.length - limite})
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function ProximasConsultas({
  proximas,
  profissionais,
  onAbrirConsulta,
}: {
  proximas: Appointment[];
  profissionais: Map<string, string>;
  onAbrirConsulta?: (appointment: Appointment) => void;
}) {
  const [todas, setTodas] = useState(false);
  const lista = todas ? proximas : proximas.slice(0, 3);

  return (
    <section
      aria-label="Próximas consultas"
      className="rounded-xl border border-teal-100 bg-teal-50/40 p-3"
    >
      <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
        Próximas consultas
      </h3>
      <ul className="flex flex-col gap-1">
        {lista.map((a) => (
          <li key={a.id}>
            <ProximaConsulta
              appointment={a}
              profissional={profissionais.get(a.doctorId)}
              onAbrir={onAbrirConsulta}
              className="rounded-lg bg-white"
            />
          </li>
        ))}
      </ul>
      {proximas.length > 3 && (
        <button
          type="button"
          onClick={() => setTodas(!todas)}
          className="mt-1 min-h-[40px] px-1 text-xs font-semibold text-teal-700 hover:underline"
        >
          {todas ? "Mostrar menos" : `Ver todas (${proximas.length})`}
        </button>
      )}
    </section>
  );
}

/** Uma consulta futura: dia, hora, tipo, profissional e status. */
export function ProximaConsulta({
  appointment: a,
  profissional,
  onAbrir,
  className,
}: {
  appointment: Appointment;
  profissional?: string;
  onAbrir?: (appointment: Appointment) => void;
  className?: string;
}) {
  const situacao = situacaoConsulta(a, false);
  const conteudo = (
    <>
      <span className="w-12 shrink-0 text-center">
        <span className="block text-[11px] font-semibold uppercase text-teal-700">
          {diaDaSemana(a.scheduledAt)}
        </span>
        <span className="block text-sm font-semibold text-neutral-900">
          {dataCurta(a.scheduledAt).slice(0, 5)}
        </span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-neutral-900 truncate">
          {hora(a.scheduledAt)} · {APPOINTMENT_TYPE_LABELS[a.type]}
        </span>
        {profissional && (
          <span className="block text-xs text-neutral-500 truncate">
            {profissional}
          </span>
        )}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs px-2 py-1 rounded-lg",
          TOM_CLASSE[situacao.tom],
        )}
      >
        {situacao.label}
      </span>
    </>
  );
  return onAbrir ? (
    <button
      type="button"
      onClick={() => onAbrir(a)}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-neutral-50 min-h-[44px]",
        className,
      )}
    >
      {conteudo}
    </button>
  ) : (
    <div className={cn("flex items-center gap-3 px-2 py-2", className)}>
      {conteudo}
    </div>
  );
}

function ItemDoHistorico({
  item,
  aberto,
  onToggle,
  profissionais,
  documentosPorFicha,
  podeVerSolicitacoes,
  onAbrirConsulta,
  cirurgiaEmNovaAba,
}: {
  item: HistoricoItem;
  aberto: boolean;
  onToggle: () => void;
  profissionais: Map<string, string>;
  documentosPorFicha: Map<string, PatientDocument[]>;
  podeVerSolicitacoes: boolean;
  onAbrirConsulta?: (appointment: Appointment) => void;
  cirurgiaEmNovaAba: boolean;
}) {
  if (item.kind === "cirurgia") {
    const { surgery } = item;
    const statusLabel = STATUS_NUMBER_TO_STRING[surgery.status] ?? "Pendente";
    const colors = STATUS_COLORS[statusLabel] ?? {
      bg: "bg-gray-50",
      text: "text-gray-600",
    };
    const quando = surgery.surgeryDate ?? surgery.createdAt;
    return (
      <Cartao
        aberto={aberto}
        onToggle={onToggle}
        icone={<Stethoscope className="w-4 h-4 text-purple-600" />}
        iconeClasse="bg-purple-50"
        titulo={nomeDaCirurgia(surgery)}
        linha={[
          quando ? dataCurta(quando) : "Sem data",
          surgery.surgeryDate ? "Cirurgia" : "Cirurgia sem data marcada",
        ]}
        badge={
          <span
            className={`text-xs px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}
          >
            {statusLabel}
          </span>
        }
      >
        {podeVerSolicitacoes ? (
          <a
            href={`/solicitacao/${surgery.id}`}
            {...(cirurgiaEmNovaAba
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir solicitação
          </a>
        ) : (
          <p className="text-sm text-neutral-400">
            Você não tem acesso às solicitações cirúrgicas.
          </p>
        )}
      </Cartao>
    );
  }

  const record = item.record;
  const doutorId =
    item.kind === "consulta" ? item.appointment.doctorId : item.record.doctorId;
  const nome = profissionais.get(doutorId);
  const documentos = record ? (documentosPorFicha.get(record.id) ?? []) : [];

  let titulo: string;
  let quando: string;
  let badge: ReactNode;
  if (item.kind === "consulta") {
    const { appointment } = item;
    const situacao = situacaoConsulta(appointment, Boolean(record));
    titulo = APPOINTMENT_TYPE_LABELS[appointment.type];
    quando = `${dataCurta(appointment.scheduledAt)} · ${hora(appointment.scheduledAt)}`;
    badge = (
      <span
        className={cn(
          "text-xs px-2 py-1 rounded-lg",
          TOM_CLASSE[situacao.tom],
        )}
      >
        {situacao.label}
      </span>
    );
  } else {
    titulo = "Atendimento sem consulta";
    quando = `${dataCurta(item.record.createdAt)} · ${hora(item.record.createdAt)}`;
    badge = item.record.finalizedAt ? null : (
      <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
        Em aberto
      </span>
    );
  }

  const resumo = record ? resumoDaFicha(record) : "";
  const selos = [
    ...(record?.cidCodes ?? []).map((c) => c.code),
    ...Array.from(
      new Set(
        documentos
          .map((d) => SELO_DOCUMENTO[d.type])
          .filter((s): s is string => Boolean(s)),
      ),
    ),
  ];
  const anexos = documentos.filter((d) => !SELO_DOCUMENTO[d.type]).length;

  return (
    <Cartao
      aberto={aberto}
      onToggle={onToggle}
      icone={
        record ? (
          <FileText className="w-4 h-4 text-teal-600" />
        ) : (
          <CalendarDays className="w-4 h-4 text-blue-600" />
        )
      }
      iconeClasse={record ? "bg-teal-50" : "bg-blue-50"}
      titulo={titulo}
      linha={[quando, nome]}
      badge={badge}
      resumo={resumo}
      selos={
        selos.length > 0 ||
        anexos > 0 ||
        record?.surgicalIndication ||
        (record && !record.finalizedAt && item.kind === "consulta") ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {record?.surgicalIndication && (
              <Selo className="bg-purple-50 text-purple-700 border-purple-200">
                Indicação cirúrgica
              </Selo>
            )}
            {record && !record.finalizedAt && item.kind === "consulta" && (
              <Selo className="bg-amber-50 text-amber-700 border-amber-200">
                Ficha em aberto
              </Selo>
            )}
            {selos.map((s) => (
              <Selo
                key={s}
                className="bg-teal-50 text-teal-700 border-teal-200"
              >
                {s}
              </Selo>
            ))}
            {anexos > 0 && (
              <Selo className="bg-neutral-50 text-neutral-600 border-neutral-200">
                <Paperclip className="w-3 h-3" />
                {anexos} {anexos === 1 ? "anexo" : "anexos"}
              </Selo>
            )}
          </div>
        ) : null
      }
    >
      {record ? (
        <DetalhesDaFicha record={record} documentos={documentos} />
      ) : (
        <p className="text-sm text-neutral-400">
          Sem anotações registradas nesta consulta.
        </p>
      )}
      {item.kind === "consulta" && (
        <HistoricoDaConsulta appointmentId={item.appointment.id} />
      )}
      {item.kind === "consulta" && onAbrirConsulta && (
        <button
          type="button"
          onClick={() => onAbrirConsulta(item.appointment)}
          className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
        >
          <CalendarClock className="w-4 h-4" />
          Abrir consulta
        </button>
      )}
    </Cartao>
  );
}

/**
 * Agendada → confirmada → chegou → atendida, remarcações e comentários. Só
 * busca quando aberta, para a linha do tempo não pagar uma requisição por
 * consulta. Aqui é leitura: comentar fica no detalhe da consulta (exige Agenda).
 */
function HistoricoDaConsulta({ appointmentId }: { appointmentId: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-100">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-2 px-3 min-h-[40px] text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
      >
        Histórico da consulta
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      {aberto && (
        <div className="px-3 pb-3 pt-1">
          <AppointmentHistory appointmentId={appointmentId} podeComentar={false} />
        </div>
      )}
    </div>
  );
}

function Selo({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold border rounded-md px-1.5 py-0.5",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Cartao({
  aberto,
  onToggle,
  icone,
  iconeClasse,
  titulo,
  linha,
  badge,
  resumo,
  selos,
  children,
}: {
  aberto: boolean;
  onToggle: () => void;
  icone: ReactNode;
  iconeClasse: string;
  titulo: string;
  linha: (string | null | undefined)[];
  badge?: ReactNode;
  resumo?: string;
  selos?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left min-h-[44px]"
      >
        <span
          className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconeClasse}`}
        >
          {icone}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">
                {titulo}
              </p>
              <p className="text-xs text-neutral-500">
                {linha.filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {badge}
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${aberto ? "rotate-180" : ""}`}
              />
            </div>
          </div>
          {resumo && !aberto && (
            <p className="mt-1 text-sm text-neutral-600 line-clamp-1">
              {resumo}
            </p>
          )}
          {selos}
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 border-t border-neutral-100">
          {children}
        </div>
      )}
    </div>
  );
}

function DetalhesDaFicha({
  record,
  documentos,
}: {
  record: ClinicalRecord;
  documentos: PatientDocument[];
}) {
  return (
    <>
      <BlocoDaFicha titulo="Anamnese" html={record.anamnesis} />
      <BlocoDaFicha titulo="Exame físico" html={record.physicalExam} />
      <BlocoDaFicha titulo="Diagnóstico" html={record.diagnosis} />
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
      <BlocoDaFicha titulo="Conduta" html={record.conduct} />
      {documentos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Documentos
          </p>
          <ul className="flex flex-col gap-1">
            {documentos.map((doc) => (
              <li key={doc.id}>
                <a
                  href={safeExternalUrl(doc.uri)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:underline break-all"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {SELO_DOCUMENTO[doc.type] ?? doc.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function BlocoDaFicha({
  titulo,
  html,
}: {
  titulo: string;
  html: string | null;
}) {
  if (!html) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
        {titulo}
      </p>
      <div
        className="prose prose-sm max-w-none text-sm text-neutral-800"
        // eslint-disable-next-line react/no-danger -- html sanitizado via sanitizeHtml (DOMPurify) antes de renderizar
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    </div>
  );
}
