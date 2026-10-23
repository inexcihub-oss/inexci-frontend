"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, History, Loader2 } from "lucide-react";
import {
  FICHA_SECOES,
  temTexto,
  type FichaTextKey,
} from "@/components/clinical/AtendimentoFicha";
import { clinicalRecordKeys } from "@/lib/query-keys";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  clinicalRecordService,
  type ClinicalCidCode,
  type ClinicalRecord,
} from "@/services/clinical-record.service";

export function escolherFichaAnterior(
  records: ClinicalRecord[],
  appointmentId: string,
  currentRecordId: string | null,
  dataDaConsulta: string,
): ClinicalRecord | null {
  const limite = new Date(dataDaConsulta).getTime();
  return (
    records
      .filter(
        (record) =>
          !!record.finalizedAt &&
          record.id !== currentRecordId &&
          record.appointmentId !== appointmentId &&
          new Date(record.createdAt).getTime() < limite,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}

export function anexarHtml(atual: string, novo: string): string {
  return temTexto(atual) ? `${atual}${novo}` : novo;
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function FichaAnterior({
  patientId,
  appointmentId,
  currentRecordId,
  dataDaConsulta,
  onCopiar,
  onCopiarCids,
}: {
  patientId: string;
  appointmentId: string;
  currentRecordId: string | null;
  dataDaConsulta: string;
  onCopiar: (key: FichaTextKey, html: string) => void;
  onCopiarCids: (cids: ClinicalCidCode[]) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: clinicalRecordKeys.byPatient(patientId),
    queryFn: () => clinicalRecordService.getByPatient(patientId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2
          className="w-5 h-5 animate-spin text-teal-600"
          aria-label="Carregando ficha anterior"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="px-1 py-6 text-sm text-red-700">
        Não foi possível carregar a ficha anterior.
      </p>
    );
  }

  const anterior = escolherFichaAnterior(
    data ?? [],
    appointmentId,
    currentRecordId,
    dataDaConsulta,
  );

  if (!anterior) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <History className="w-6 h-6 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-neutral-600">
          Nenhum atendimento finalizado antes deste.
        </p>
      </div>
    );
  }

  const secoes = FICHA_SECOES.filter((secao) =>
    temTexto(anterior[secao.key] ?? ""),
  );
  const cids = anterior.cidCodes ?? [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-600">
        Atendimento de{" "}
        <span className="font-medium text-neutral-800">
          {formatarData(anterior.createdAt)}
        </span>
      </p>

      {secoes.length === 0 && cids.length === 0 && (
        <p className="text-sm text-neutral-500">A ficha anterior está vazia.</p>
      )}

      {secoes.map((secao) => (
        <section
          key={secao.key}
          aria-labelledby={`anterior-${secao.key}`}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              id={`anterior-${secao.key}`}
              className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
            >
              {secao.title}
            </h3>
            <BotaoCopiar
              label={`Copiar ${secao.title} para esta consulta`}
              onClick={() => onCopiar(secao.key, anterior[secao.key] ?? "")}
            />
          </div>
          <div
            className="rte-content rte-clinical text-sm leading-relaxed text-neutral-800"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(anterior[secao.key] ?? ""),
            }}
          />
        </section>
      ))}

      {cids.length > 0 && (
        <section aria-labelledby="anterior-cid" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3
              id="anterior-cid"
              className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
            >
              CID-10
            </h3>
            <BotaoCopiar
              label="Copiar CID-10 para esta consulta"
              onClick={() => onCopiarCids(cids)}
            />
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {cids.map((cid) => (
              <li
                key={cid.code}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700"
              >
                <span className="font-semibold">{cid.code}</span>{" "}
                {cid.description}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BotaoCopiar({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors"
    >
      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      Copiar
    </button>
  );
}
