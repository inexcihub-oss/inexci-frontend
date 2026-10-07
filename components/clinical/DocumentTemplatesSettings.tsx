"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  clinicalDocumentTemplateService,
  ClinicalDocumentTemplate,
  ClinicalDocumentTemplateKind,
  DOCUMENT_TEMPLATE_BODY_MAX,
  DOCUMENT_TEMPLATE_KIND_LABELS,
  DOCUMENT_TEMPLATE_PLACEHOLDERS,
} from "@/services/clinical-document-template.service";

const KINDS: ClinicalDocumentTemplateKind[] = [
  "medical_certificate",
  "exam_referral",
];

interface Rascunho {
  id: string | null;
  kind: ClinicalDocumentTemplateKind;
  name: string;
  body: string;
}

/**
 * Modelos de texto de atestado e pedido de exame (MIG-06). O texto é puro,
 * com quebras de linha, e os placeholders são preenchidos na hora de emitir.
 * Só médicos com CRM emitem esses documentos, então só eles veem a aba.
 */
export function DocumentTemplatesSettings({ doctorId }: { doctorId: string }) {
  const [templates, setTemplates] = useState<ClinicalDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<ClinicalDocumentTemplate | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const carregar = useCallback(async () => {
    try {
      setTemplates(await clinicalDocumentTemplateService.getAll({ doctorId }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os modelos."));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Insere o placeholder onde está o cursor (ou no fim). */
  const inserirPlaceholder = (key: string) => {
    if (!rascunho) return;
    const marca = `{{${key}}}`;
    const el = bodyRef.current;
    const inicio = el?.selectionStart ?? rascunho.body.length;
    const fim = el?.selectionEnd ?? rascunho.body.length;
    const body =
      rascunho.body.slice(0, inicio) + marca + rascunho.body.slice(fim);
    setRascunho({ ...rascunho, body });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(inicio + marca.length, inicio + marca.length);
    });
  };

  const salvar = async () => {
    if (!rascunho) return;
    const name = rascunho.name.trim();
    if (!name || !rascunho.body.trim()) {
      setError("Informe o nome e o texto do modelo.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (rascunho.id) {
        await clinicalDocumentTemplateService.update(rascunho.id, {
          name,
          body: rascunho.body,
        });
      } else {
        await clinicalDocumentTemplateService.create({
          kind: rascunho.kind,
          name,
          body: rascunho.body,
        });
      }
      setRascunho(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o modelo."));
    } finally {
      setSaving(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setDeleting(true);
    try {
      await clinicalDocumentTemplateService.delete(excluindo.id);
      setExcluindo(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível excluir o modelo."));
      setExcluindo(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Modelos de documentos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Textos prontos para o atestado e para a indicação clínica do
            pedido de exame. Escolha o modelo na hora de emitir.
          </p>
        </div>
        {!rascunho && (
          <Button
            variant="outline"
            className="min-h-[44px] shrink-0"
            onClick={() => {
              setError(null);
              setRascunho({
                id: null,
                kind: "medical_certificate",
                name: "",
                body: "",
              });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo modelo
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {rascunho && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
          {rascunho.id ? (
            <p className="text-sm font-semibold text-gray-700">
              Editando modelo de{" "}
              {DOCUMENT_TEMPLATE_KIND_LABELS[rascunho.kind].toLowerCase()}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="document-template-kind" className="ds-label">
                Documento
              </label>
              <select
                id="document-template-kind"
                className="ds-input min-h-[44px]"
                value={rascunho.kind}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    kind: e.target.value as ClinicalDocumentTemplateKind,
                  })
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DOCUMENT_TEMPLATE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            id="document-template-name"
            label="Nome do modelo"
            value={rascunho.name}
            maxLength={100}
            onChange={(e) => setRascunho({ ...rascunho, name: e.target.value })}
            placeholder="Ex.: Atestado padrão"
          />

          <div className="flex flex-col gap-1.5">
            <span className="ds-label">Inserir campo</span>
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_TEMPLATE_PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => inserirPlaceholder(p.key)}
                  className="px-2.5 py-1 rounded-full border border-teal-200 bg-teal-50 text-xs font-medium text-teal-800 hover:bg-teal-100 min-h-[32px]"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            ref={bodyRef}
            id="document-template-body"
            label="Texto"
            rows={6}
            maxLength={DOCUMENT_TEMPLATE_BODY_MAX}
            value={rascunho.body}
            onChange={(e) => setRascunho({ ...rascunho, body: e.target.value })}
            placeholder="Atesto, para os devidos fins, que {{paciente.nome}} esteve em consulta em {{data}}..."
          />
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-gray-500">
              Escreva só o texto: título, dados do paciente e assinatura
              entram sozinhos no documento.
            </p>
            <p className="text-xs text-gray-400 shrink-0">
              {rascunho.body.length}/{DOCUMENT_TEMPLATE_BODY_MAX}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={saving}
              onClick={() => {
                setRascunho(null);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button className="min-h-[44px]" disabled={saving} onClick={salvar}>
              {saving ? "Salvando..." : "Salvar modelo"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando modelos...</p>
      ) : (
        KINDS.map((kind) => {
          const doTipo = templates.filter((t) => t.kind === kind);
          return (
            <section key={kind} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {DOCUMENT_TEMPLATE_KIND_LABELS[kind]}
              </h3>
              {doTipo.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum modelo ainda.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {doTipo.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-800 truncate">
                          {t.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Editar ${t.name}`}
                          onClick={() => {
                            setError(null);
                            setRascunho({
                              id: t.id,
                              kind: t.kind,
                              name: t.name,
                              body: t.body,
                            });
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${t.name}`}
                          onClick={() => setExcluindo(t)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      <ConfirmDeleteModal
        isOpen={excluindo !== null}
        title="Excluir modelo"
        itemName={excluindo?.name}
        softDelete
        loading={deleting}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
