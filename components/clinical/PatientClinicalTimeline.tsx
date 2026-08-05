"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import {
  clinicalRecordService,
  ClinicalRecord,
} from "@/services/clinical-record.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { FileText, ChevronDown } from "lucide-react";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Fichas de atendimento do paciente (prontuário), expansíveis e read-only. */
export function PatientClinicalTimeline({ patientId }: { patientId: string }) {
  const { can } = useAuth();
  // `GET /clinical-records` também exige Atendimento na classe do
  // controller — sem a permissão não há prontuário legítimo para mostrar, e
  // "renderizar vazio" mentiria (pareceria que o paciente não tem
  // atendimento nenhum). Melhor a seção nem existir para esse usuário; quem
  // monta o card em volta (`pacientes/[id]/page.tsx`) também não renderiza o
  // título nesse caso.
  const podeAtendimento = can(Permission.ATENDIMENTO);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!podeAtendimento) {
      setLoading(false);
      return;
    }
    let active = true;
    clinicalRecordService
      .getByPatient(patientId)
      .then((r) => active && setRecords(r))
      .catch(() => active && setRecords([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [patientId, podeAtendimento]);

  if (!podeAtendimento) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">
        Nenhum atendimento registrado para este paciente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {records.map((r) => {
        const isOpen = openId === r.id;
        const summary =
          stripHtml(r.diagnosis) || stripHtml(r.anamnesis) || "Atendimento";
        return (
          <div
            key={r.id}
            className="rounded-xl border border-neutral-100 overflow-hidden"
          >
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-teal-600" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {summary}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatDate(r.createdAt)}
                  {r.finalizedAt ? (
                    <span className="ml-2 text-green-600">· Finalizado</span>
                  ) : (
                    <span className="ml-2 text-amber-600">· Em aberto</span>
                  )}
                </p>
              </div>
              {r.cidCodes && r.cidCodes.length > 0 && (
                <span className="hidden sm:inline text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-0.5 shrink-0">
                  {r.cidCodes.map((c) => c.code).join(", ")}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-neutral-100">
                <RecordBlock title="Anamnese" html={r.anamnesis} />
                <RecordBlock title="Exame físico" html={r.physicalExam} />
                <RecordBlock title="Diagnóstico" html={r.diagnosis} />
                {r.cidCodes && r.cidCodes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                      CID-10
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.cidCodes.map((c) => (
                        <span
                          key={c.code}
                          className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-0.5"
                        >
                          <strong>{c.code}</strong> {c.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <RecordBlock title="Conduta" html={r.conduct} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecordBlock({ title, html }: { title: string; html: string | null }) {
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
