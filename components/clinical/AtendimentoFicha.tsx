"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CidPicker } from "@/components/clinical/CidPicker";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  ClinicalRecord,
  ClinicalCidCode,
} from "@/services/clinical-record.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import {
  ClipboardList,
  Stethoscope,
  Activity,
  ClipboardCheck,
  Scissors,
  ArrowUpRight,
} from "lucide-react";

const RichTextEditor = dynamic(
  () =>
    import("@/components/shared/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="ds-textarea opacity-50" /> },
);

export interface FichaFields {
  anamnesis: string;
  physicalExam: string;
  diagnosis: string;
  conduct: string;
  cidCodes: ClinicalCidCode[];
  surgicalIndication: boolean;
}

/** Estado inicial da ficha a partir de um registro já persistido (ou vazio). */
export function fichaFieldsFrom(record: ClinicalRecord | null): FichaFields {
  return {
    anamnesis: record?.anamnesis ?? "",
    physicalExam: record?.physicalExam ?? "",
    diagnosis: record?.diagnosis ?? "",
    conduct: record?.conduct ?? "",
    cidCodes: record?.cidCodes ?? [],
    surgicalIndication: record?.surgicalIndication ?? false,
  };
}

/**
 * Conteúdo da aba "Atendimento": as quatro seções clínicas. Componente
 * controlado — o estado, o salvamento e o header vivem no `AtendimentoTabs`,
 * que é quem sabe se a ficha está finalizada e o que já foi persistido.
 */
export function AtendimentoFicha({
  fields,
  onFieldChange,
  readOnly,
  surgeryRequestId,
}: {
  fields: FichaFields;
  onFieldChange: <K extends keyof FichaFields>(
    key: K,
    value: FichaFields[K],
  ) => void;
  readOnly: boolean;
  /** SC já criada a partir desta ficha, se houver. */
  surgeryRequestId: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        icon={<ClipboardList className="w-4 h-4" />}
        title="Anamnese"
      >
        <EditorField
          value={fields.anamnesis}
          onChange={(v) => onFieldChange("anamnesis", v)}
          readOnly={readOnly}
          placeholder="Queixa principal, história da doença atual, antecedentes..."
        />
      </SectionCard>

      <SectionCard
        icon={<Stethoscope className="w-4 h-4" />}
        title="Exame físico"
      >
        <EditorField
          value={fields.physicalExam}
          onChange={(v) => onFieldChange("physicalExam", v)}
          readOnly={readOnly}
          placeholder="Achados do exame físico..."
        />
      </SectionCard>

      <SectionCard
        icon={<Activity className="w-4 h-4" />}
        title="Diagnóstico / Hipótese"
      >
        <EditorField
          value={fields.diagnosis}
          onChange={(v) => onFieldChange("diagnosis", v)}
          readOnly={readOnly}
          placeholder="Diagnóstico ou hipótese diagnóstica..."
        />
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
      </SectionCard>

      <SectionCard
        icon={<ClipboardCheck className="w-4 h-4" />}
        title="Conduta / Plano"
      >
        <EditorField
          value={fields.conduct}
          onChange={(v) => onFieldChange("conduct", v)}
          readOnly={readOnly}
          placeholder="Conduta, prescrição, orientações, retorno..."
        />
      </SectionCard>

      <IndicacaoCirurgicaCard
        checked={fields.surgicalIndication}
        onChange={(v) => onFieldChange("surgicalIndication", v)}
        readOnly={readOnly}
        surgeryRequestId={surgeryRequestId}
      />
    </div>
  );
}

/**
 * O marcador que dispara a criação da solicitação cirúrgica ao finalizar o
 * atendimento. Depois de finalizada, a ficha mostra o resultado: o link da SC
 * criada ou o aviso de que a criação está em andamento — nesse caso o backend
 * retoma sozinho (ver o sweeper do SurgicalIndicationService), então não há
 * ação nenhuma a cobrar do médico.
 */
export function IndicacaoCirurgicaCard({
  checked,
  onChange,
  readOnly,
  surgeryRequestId,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  readOnly: boolean;
  surgeryRequestId: string | null;
}) {
  const { can } = useAuth();
  const podeVerSolicitacoes = can(Permission.SOLICITACOES);
  return (
    <SectionCard
      icon={<Scissors className="w-4 h-4" />}
      title="Indicação cirúrgica"
      dataTour="ficha-indicacao"
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
          {!readOnly && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Ao finalizar o atendimento, uma solicitação cirúrgica será criada
              em Pendente para este paciente.
            </p>
          )}
        </div>
      </div>

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
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  /** Âncora do tour de onboarding para este card, quando houver. */
  dataTour?: string;
}) {
  return (
    <section
      data-tour={dataTour}
      className="rounded-2xl border border-neutral-100 bg-white shadow-sm"
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

function EditorField({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  if (readOnly) {
    return (
      <div
        className="prose prose-sm max-w-none rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 min-h-[60px]"
        // eslint-disable-next-line react/no-danger -- html sanitizado via sanitizeHtml (DOMPurify) antes de renderizar
        dangerouslySetInnerHTML={{
          __html: value
            ? sanitizeHtml(value)
            : "<p class='text-neutral-400'>Não preenchido.</p>",
        }}
      />
    );
  }
  return (
    <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
  );
}
