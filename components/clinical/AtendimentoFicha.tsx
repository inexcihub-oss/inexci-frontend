"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CidPicker } from "@/components/clinical/CidPicker";
import { Checkbox } from "@/components/ui/Checkbox";
import { Modal } from "@/components/ui/Modal";
import { ProcedureQuickPickerModal } from "@/components/procedures/ProcedureQuickPickerModal";
import {
  ClinicalRecord,
  ClinicalCidCode,
} from "@/services/clinical-record.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ModoFicha } from "@/hooks/useModoFicha";
import type { SnippetOption } from "@/components/shared/RichTextEditor";

export interface FerramentasDeTexto {
  snippets?: SnippetOption[];
  onSnippetUsed?: (id: string) => void;
  onSaveSelection?: (html: string) => void;
}
import {
  ClipboardList,
  Stethoscope,
  Activity,
  ClipboardCheck,
  Scissors,
  ArrowUpRight,
  Search,
  Check,
  CheckCircle2,
  Circle,
  Maximize2,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

const RichTextEditor = dynamic(
  () =>
    import("@/components/shared/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[140px]" /> },
);

export interface FichaFields {
  anamnesis: string;
  physicalExam: string;
  diagnosis: string;
  conduct: string;
  cidCodes: ClinicalCidCode[];
  surgicalIndication: boolean;
  procedureId: string | null;
  procedureName: string;
}

export function fichaFieldsFrom(record: ClinicalRecord | null): FichaFields {
  return {
    anamnesis: record?.anamnesis ?? "",
    physicalExam: record?.physicalExam ?? "",
    diagnosis: record?.diagnosis ?? "",
    conduct: record?.conduct ?? "",
    cidCodes: record?.cidCodes ?? [],
    surgicalIndication: record?.surgicalIndication ?? false,
    procedureId: record?.procedureId ?? null,
    procedureName: record?.procedure?.name ?? "",
  };
}

export type FichaTextKey = "anamnesis" | "physicalExam" | "diagnosis" | "conduct";

export interface FichaSecaoMeta {
  key: FichaTextKey;
  id: string;
  title: string;
  shortTitle: string;
  icon: LucideIcon;
  placeholder: string;
  minHeight: string;
}

export const FICHA_INDICACAO_ID = "ficha-indicacao";

export const FICHA_SECOES: FichaSecaoMeta[] = [
  {
    key: "anamnesis",
    id: "ficha-anamnese",
    title: "Anamnese",
    shortTitle: "Anamnese",
    icon: ClipboardList,
    placeholder: "Queixa principal, história da doença atual, antecedentes...",
    minHeight: "200px",
  },
  {
    key: "physicalExam",
    id: "ficha-exame-fisico",
    title: "Exame físico",
    shortTitle: "Exame físico",
    icon: Stethoscope,
    placeholder: "Achados do exame físico...",
    minHeight: "140px",
  },
  {
    key: "diagnosis",
    id: "ficha-diagnostico",
    title: "Diagnóstico / Hipótese",
    shortTitle: "Diagnóstico",
    icon: Activity,
    placeholder: "Diagnóstico ou hipótese diagnóstica...",
    minHeight: "120px",
  },
  {
    key: "conduct",
    id: "ficha-conduta",
    title: "Conduta / Plano",
    shortTitle: "Conduta",
    icon: ClipboardCheck,
    placeholder: "Conduta, prescrição, orientações, retorno...",
    minHeight: "140px",
  },
];

export const FICHA_EVOLUCAO: FichaSecaoMeta = {
  key: "anamnesis",
  id: "ficha-anamnese",
  title: "Evolução",
  shortTitle: "Evolução",
  icon: NotebookPen,
  placeholder:
    "Escreva o atendimento de corrido: queixa, exame, hipótese e conduta...",
  minHeight: "320px",
};

export function useSecoesDaFicha(
  fields: FichaFields,
  modo: ModoFicha,
  readOnly: boolean,
): FichaSecaoMeta[] {
  const preenchidas = FICHA_SECOES.filter(
    (secao) => secao.key !== "anamnesis" && temTexto(fields[secao.key]),
  ).map((secao) => secao.key);
  const chavePreenchidas = preenchidas.join(",");
  const [extras, setExtras] = useState<FichaTextKey[]>(preenchidas);

  useEffect(() => {
    if (!chavePreenchidas) return;
    const novas = chavePreenchidas.split(",") as FichaTextKey[];
    setExtras((atual) =>
      novas.every((key) => atual.includes(key))
        ? atual
        : [...new Set([...atual, ...novas])],
    );
  }, [chavePreenchidas]);

  useEffect(() => {
    if (modo === "secoes") setExtras([]);
  }, [modo]);

  if (readOnly || modo === "secoes") return FICHA_SECOES;
  return [
    FICHA_EVOLUCAO,
    ...FICHA_SECOES.filter(
      (secao) =>
        secao.key !== "anamnesis" &&
        (extras.includes(secao.key) || preenchidas.includes(secao.key)),
    ),
  ];
}

export function ModoFichaToggle({
  modo,
  onChange,
}: {
  modo: ModoFicha;
  onChange: (modo: ModoFicha) => void;
}) {
  const opcoes: Array<{ valor: ModoFicha; label: string }> = [
    { valor: "secoes", label: "Seções" },
    { valor: "livre", label: "Evolução livre" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo da ficha"
      className="inline-flex rounded-xl bg-neutral-100 p-1"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          role="radio"
          aria-checked={modo === opcao.valor}
          onClick={() => onChange(opcao.valor)}
          className={cn(
            "min-h-[36px] rounded-lg px-3.5 text-sm transition-colors",
            modo === opcao.valor
              ? "bg-white font-semibold text-neutral-900 shadow-sm"
              : "font-medium text-neutral-600 hover:text-neutral-900",
          )}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

export function temTexto(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0
  );
}

export function secaoPreenchida(
  fields: FichaFields,
  key: FichaTextKey,
): boolean {
  if (key === "diagnosis" && fields.cidCodes.length > 0) return true;
  return temTexto(fields[key]);
}

function areaRolavel(el: HTMLElement): HTMLElement | null {
  let atual = el.parentElement;
  while (atual) {
    const { overflowY } = getComputedStyle(atual);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      atual.scrollHeight > atual.clientHeight
    )
      return atual;
    atual = atual.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

export function focarSecaoDaFicha(id: string) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const focavel =
    alvo.querySelector<HTMLElement>('[contenteditable="true"]') ??
    alvo.querySelector<HTMLElement>("textarea, input") ??
    alvo.querySelector<HTMLElement>("button");
  const focar = () => focavel?.focus({ preventScroll: true });
  const container = areaRolavel(alvo);
  if (!container || typeof container.scrollTo !== "function") {
    focar();
    return;
  }
  const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0;
  const inicio =
    container === document.scrollingElement
      ? 0
      : container.getBoundingClientRect().top;
  const maximo = container.scrollHeight - container.clientHeight;
  const destino = Math.min(
    maximo,
    Math.max(
      0,
      alvo.getBoundingClientRect().top - inicio + container.scrollTop - margem,
    ),
  );
  if (Math.abs(container.scrollTop - destino) < 2) {
    focar();
    return;
  }
  const origemDoEvento: HTMLElement | Window =
    container === document.scrollingElement ? window : container;
  let concluido = false;
  const concluir = () => {
    if (concluido) return;
    concluido = true;
    origemDoEvento.removeEventListener("scrollend", aoTerminar);
    focar();
  };
  const aoTerminar = () => {
    if (Math.abs(container.scrollTop - destino) < 2) concluir();
  };
  origemDoEvento.addEventListener("scrollend", aoTerminar);
  window.setTimeout(concluir, 1500);
  container.scrollTo({ top: destino, behavior: "smooth" });
}

export function AtendimentoFicha({
  fields,
  onFieldChange,
  readOnly,
  surgeryRequestId,
  allowSurgicalIndication = true,
  surgicalIndicationBlockedReason,
  keepSurgicalIndicationVisible = false,
  secoes = FICHA_SECOES,
  ferramentas,
}: {
  secoes?: FichaSecaoMeta[];
  ferramentas?: FerramentasDeTexto;
  surgicalIndicationBlockedReason?: string;
  allowSurgicalIndication?: boolean;
  keepSurgicalIndicationVisible?: boolean;
  fields: FichaFields;
  onFieldChange: <K extends keyof FichaFields>(
    key: K,
    value: FichaFields[K],
  ) => void;
  readOnly: boolean;
  surgeryRequestId: string | null;
}) {
  const mostrarIndicacao =
    allowSurgicalIndication ||
    fields.surgicalIndication ||
    keepSurgicalIndicationVisible;

  return (
    <div className="flex flex-col gap-4">
      <article
        aria-label="Ficha clínica"
        className="rounded-2xl border border-neutral-100 bg-white shadow-sm divide-y divide-neutral-100 overflow-hidden"
      >
        {secoes.map((secao) => {
          const cidAqui =
            secao.key === "diagnosis" ||
            (secao.key === "anamnesis" &&
              !secoes.some((s) => s.key === "diagnosis"));
          return (
            <FichaSecao
              key={`${secao.id}-${secao.title}`}
              secao={secao}
              value={fields[secao.key]}
              onChange={(v) => onFieldChange(secao.key, v)}
              readOnly={readOnly}
              ferramentas={ferramentas}
            >
              {cidAqui && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                    CID-10
                  </p>
                  <CidPicker
                    value={fields.cidCodes}
                    onChange={(v) => onFieldChange("cidCodes", v)}
                    disabled={readOnly}
                  />
                </div>
              )}
            </FichaSecao>
          );
        })}
      </article>

      {mostrarIndicacao && (
        <IndicacaoCirurgicaCard
          checked={fields.surgicalIndication}
          onChange={(v) => onFieldChange("surgicalIndication", v)}
          procedureId={fields.procedureId}
          procedureName={fields.procedureName}
          onProcedureChange={(id, name) => {
            onFieldChange("procedureId", id);
            onFieldChange("procedureName", name);
          }}
          readOnly={
            readOnly ||
            (!fields.surgicalIndication &&
              (!allowSurgicalIndication || !!surgicalIndicationBlockedReason))
          }
          blockedReason={readOnly ? undefined : surgicalIndicationBlockedReason}
          surgeryRequestId={surgeryRequestId}
        />
      )}
    </div>
  );
}

function FichaSecao({
  secao,
  value,
  onChange,
  readOnly,
  ferramentas,
  children,
}: {
  secao: FichaSecaoMeta;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  ferramentas?: FerramentasDeTexto;
  children?: React.ReactNode;
}) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  const [emFoco, setEmFoco] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const extrasRef = useRef<HTMLDivElement>(null);
  const Icon = secao.icon;
  const titleId = `${secao.id}-titulo`;

  const foraDosExtras = (node: EventTarget | null) =>
    !(node instanceof Node && extrasRef.current?.contains(node));

  return (
    <section
      id={secao.id}
      aria-labelledby={titleId}
      onFocus={(e) => setEmFoco(foraDosExtras(e.target))}
      onBlur={(e) => {
        const destino = e.relatedTarget;
        if (
          destino instanceof Node &&
          e.currentTarget.contains(destino) &&
          foraDosExtras(destino)
        )
          return;
        setEmFoco(false);
      }}
      className={cn(
        "scroll-mt-16 px-4 sm:px-6 pt-4 pb-5 transition-colors",
        emFoco && !readOnly && "bg-teal-50/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 min-h-[36px] mb-2">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "w-4 h-4 shrink-0",
              emFoco && !readOnly ? "text-teal-600" : "text-neutral-400",
            )}
            aria-hidden="true"
          />
          <h2
            id={titleId}
            className={cn(
              "text-sm font-semibold",
              emFoco && !readOnly ? "text-teal-800" : "text-neutral-800",
            )}
          >
            {secao.title}
          </h2>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <div
              ref={setToolbarSlot}
              className={cn(
                "transition-opacity",
                emFoco ? "opacity-100" : "invisible opacity-0",
              )}
            />
            <button
              type="button"
              onClick={() => setTelaCheia(true)}
              aria-label={`Expandir ${secao.title} em tela cheia`}
              title="Expandir em tela cheia"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {readOnly ? (
        <div
          className="rte-content rte-clinical text-[15px] leading-relaxed text-neutral-800"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: value
              ? sanitizeHtml(value)
              : "<p class='text-neutral-400'>Não preenchido.</p>",
          }}
        />
      ) : (
        <RichTextEditor
          variant="clinical"
          value={value}
          onChange={onChange}
          placeholder={secao.placeholder}
          ariaLabel={secao.title}
          minHeight={secao.minHeight}
          toolbarSlot={toolbarSlot}
          {...ferramentas}
        />
      )}
      {children && <div ref={extrasRef}>{children}</div>}
      {!readOnly && (
        <ModoFoco
          isOpen={telaCheia}
          onClose={() => setTelaCheia(false)}
          secao={secao}
          value={value}
          onChange={onChange}
          ferramentas={ferramentas}
        />
      )}
    </section>
  );
}

function ModoFoco({
  isOpen,
  onClose,
  secao,
  value,
  onChange,
  ferramentas,
}: {
  isOpen: boolean;
  onClose: () => void;
  secao: FichaSecaoMeta;
  value: string;
  onChange: (v: string) => void;
  ferramentas?: FerramentasDeTexto;
}) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={secao.title} size="full">
      <div
        ref={setToolbarSlot}
        className="sticky top-0 z-10 flex justify-center border-b border-neutral-100 bg-white px-4 py-2"
      />
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 py-5">
        <RichTextEditor
          variant="clinical"
          value={value}
          onChange={onChange}
          placeholder={secao.placeholder}
          ariaLabel={`${secao.title} em tela cheia`}
          minHeight="50vh"
          toolbarSlot={toolbarSlot}
          autoFocus
          {...ferramentas}
        />
      </div>
    </Modal>
  );
}

export function FichaIndice({
  fields,
  mostrarIndicacao,
  orientation,
  secoes = FICHA_SECOES,
}: {
  fields: FichaFields;
  mostrarIndicacao: boolean;
  orientation: "vertical" | "horizontal";
  secoes?: FichaSecaoMeta[];
}) {
  const itens = [
    ...secoes.map((secao) => ({
      id: secao.id,
      label: secao.shortTitle,
      preenchida: secaoPreenchida(fields, secao.key),
    })),
    ...(mostrarIndicacao
      ? [
          {
            id: FICHA_INDICACAO_ID,
            label: "Indicação cirúrgica",
            preenchida: fields.surgicalIndication,
          },
        ]
      : []),
  ];

  if (orientation === "horizontal") {
    return (
      <nav
        aria-label="Seções da ficha"
        className="flex gap-2 overflow-x-auto scrollbar-hide"
      >
        {itens.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={
              item.preenchida ? `${item.label} (preenchida)` : item.label
            }
            onClick={() => focarSecaoDaFicha(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 shrink-0 min-h-[36px] rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
              item.preenchida
                ? "border-teal-200 bg-teal-50 text-teal-800"
                : "border-neutral-200 bg-white text-neutral-700",
            )}
          >
            {item.preenchida && (
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {item.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Seções da ficha" className="flex flex-col gap-0.5">
      <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Ficha
      </p>
      {itens.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={
            item.preenchida ? `${item.label} (preenchida)` : item.label
          }
          onClick={() => focarSecaoDaFicha(item.id)}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          {item.preenchida ? (
            <CheckCircle2
              className="w-4 h-4 shrink-0 text-teal-600"
              aria-hidden="true"
            />
          ) : (
            <Circle
              className="w-4 h-4 shrink-0 text-neutral-300"
              aria-hidden="true"
            />
          )}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function IndicacaoCirurgicaCard({
  checked,
  onChange,
  procedureId,
  procedureName,
  onProcedureChange,
  readOnly,
  surgeryRequestId,
  blockedReason,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  procedureId: string | null;
  procedureName: string;
  onProcedureChange: (id: string, name: string) => void;
  readOnly: boolean;
  surgeryRequestId: string | null;
  blockedReason?: string;
}) {
  const { can } = useAuth();
  const podeVerSolicitacoes = can(Permission.SOLICITACOES);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <SectionCard
      icon={<Scissors className="w-4 h-4" />}
      title="Indicação cirúrgica"
      dataTour="ficha-indicacao"
      id={FICHA_INDICACAO_ID}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={onChange}
          disabled={readOnly}
          aria-label="Paciente cirúrgico"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900">
            Paciente cirúrgico
          </p>
          {blockedReason ? (
            <p className="text-xs text-neutral-500 mt-0.5">{blockedReason}</p>
          ) : (
            !readOnly && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Ao finalizar o atendimento, uma solicitação cirúrgica será
                criada em Pendente para este paciente.
              </p>
            )
          )}
        </div>
      </div>

      {checked && !readOnly && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            Procedimento
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors"
          >
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <span
              className={
                procedureName ? "text-neutral-900 truncate" : "text-neutral-400"
              }
            >
              {procedureName || "Selecionar procedimento"}
            </span>
          </button>
          <ProcedureQuickPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            selectedProcedureId={procedureId}
            onSelect={(procedure) =>
              onProcedureChange(procedure.id, procedure.name)
            }
          />
        </div>
      )}

      {readOnly && checked && procedureName && (
        <p className="mt-3 text-sm text-neutral-600">
          <span className="text-neutral-400">Procedimento: </span>
          {procedureName}
        </p>
      )}

      {readOnly && checked && (
        <div className="mt-3">
          {surgeryRequestId ? (
            podeVerSolicitacoes ? (
              <Link
                href={`/solicitacao/${surgeryRequestId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                Abrir solicitação
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            ) : (
              <p className="text-sm text-neutral-500">
                Uma solicitação cirúrgica foi criada para este paciente.
              </p>
            )
          ) : (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              A solicitação está sendo criada e aparecerá em Solicitações em
              instantes.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function SectionCard({
  icon,
  title,
  children,
  dataTour,
  id,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  dataTour?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-tour={dataTour}
      className="scroll-mt-16 rounded-2xl border border-neutral-100 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
        <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
