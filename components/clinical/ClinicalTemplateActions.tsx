"use client";

import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, LayoutTemplate } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ModalFooter } from "@/components/shared/ModalFooter";
import {
  clinicalRecordTemplateService,
  ClinicalRecordTemplate,
} from "@/services/clinical-record-template.service";
import { ClinicalCidCode } from "@/services/clinical-record.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";

/** Campos clínicos que viajam entre a ficha e o modelo. */
export interface TemplateFields {
  anamnesis: string;
  physicalExam: string;
  diagnosis: string;
  conduct: string;
  cidCodes: ClinicalCidCode[];
}

const hasContent = (fields: TemplateFields): boolean =>
  Boolean(
    fields.anamnesis.trim() ||
      fields.physicalExam.trim() ||
      fields.diagnosis.trim() ||
      fields.conduct.trim() ||
      fields.cidCodes.length,
  );

/**
 * Modelos de anamnese na tela de atendimento: aplicar um modelo escreve o
 * texto-base nos campos da ficha; salvar cria um modelo novo a partir do que
 * está digitado. Nada é gravado no atendimento aqui — quem escreve na ficha é
 * a casca, e o médico ainda precisa salvar.
 */
export function ClinicalTemplateActions({
  doctorId,
  fields,
  onApply,
}: {
  doctorId: string;
  fields: TemplateFields;
  onApply: (template: ClinicalRecordTemplate) => void;
}) {
  const [templates, setTemplates] = useState<ClinicalRecordTemplate[]>([]);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(() => {
    clinicalRecordTemplateService
      .getAll(doctorId)
      .then(setTemplates)
      .catch((err) => {
        logger.error("Erro ao carregar modelos de anamnese:", err);
        setTemplates([]);
      });
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = async (template: ClinicalRecordTemplate) => {
    // Aplicar substitui o texto dos campos — com a ficha já preenchida, o
    // médico perderia o que escreveu sem perceber.
    if (
      hasContent(fields) &&
      !window.confirm(
        `Aplicar o modelo "${template.name}" substitui o que já foi escrito na ficha. Continuar?`,
      )
    ) {
      return;
    }

    setApplyingId(template.id);
    try {
      const applied = await clinicalRecordTemplateService.apply(template.id);
      onApply(applied);
    } catch (err) {
      logger.error("Erro ao aplicar modelo:", err);
      // Sem o contador de uso o modelo ainda serve; aplica o que já temos.
      onApply(template);
    } finally {
      setApplyingId(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Informe um nome para o modelo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await clinicalRecordTemplateService.create({
        name: name.trim(),
        doctorId,
        specialty: specialty.trim() || undefined,
        anamnesis: fields.anamnesis || undefined,
        physicalExam: fields.physicalExam || undefined,
        diagnosis: fields.diagnosis || undefined,
        conduct: fields.conduct || undefined,
        cidCodes: fields.cidCodes.length ? fields.cidCodes : undefined,
      });
      setIsSaveOpen(false);
      setName("");
      setSpecialty("");
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o modelo."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
        {templates.length > 0 && (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <LayoutTemplate className="w-4 h-4" />
              Aplicar modelo:
            </span>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleApply(template)}
                disabled={applyingId === template.id}
                className="rounded-full border border-neutral-200 px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 text-xs font-medium text-neutral-700 hover:border-teal-500 hover:text-teal-700 transition-colors disabled:opacity-50"
                title={template.specialty ?? undefined}
              >
                {template.name}
              </button>
            ))}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsSaveOpen(true);
          }}
          disabled={!hasContent(fields)}
          className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center sm:justify-start gap-1.5 min-h-[44px] text-xs font-semibold text-teal-700 hover:underline disabled:text-neutral-400 disabled:no-underline disabled:cursor-not-allowed"
        >
          <BookmarkPlus className="w-4 h-4" />
          Salvar como modelo
        </button>
      </div>

      <Modal
        isOpen={isSaveOpen}
        onClose={() => !saving && setIsSaveOpen(false)}
        title="Salvar como modelo"
        size="sm"
      >
        <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            O texto atual da ficha vira um modelo reaproveitável nos próximos
            atendimentos. Os dados do paciente não são salvos.
          </p>
          <Input
            id="clinical-template-name"
            label="Nome do modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Primeira consulta — lombalgia"
            maxLength={100}
          />
          <Input
            id="clinical-template-specialty"
            label="Especialidade (opcional)"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex.: Ortopedia"
            maxLength={100}
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <ModalFooter align="end" className="flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsSaveOpen(false)}
            disabled={saving}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            isLoading={saving}
            className="min-h-[44px]"
          >
            Salvar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
