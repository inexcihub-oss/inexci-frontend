"use client";

import { useState } from "react";
import { FileText, Stethoscope, ClipboardList, Eye } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { CidPicker } from "@/components/clinical/CidPicker";
import { DocumentPreview } from "@/components/clinical/DocumentPreview";
import { TussCodePicker } from "@/components/tuss/TussCodePicker";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import {
  clinicalRecordService,
  ClinicalCidCode,
  ClinicalDocumentKind,
  ClinicalDocumentTarget,
  GeneratedClinicalDocument,
} from "@/services/clinical-record.service";
import { getApiErrorMessage } from "@/lib/http-error";

type DocumentKind = "prescription" | "certificate" | "referral";

const MODAL_TITLE: Record<DocumentKind, string> = {
  prescription: "Emitir receita",
  certificate: "Emitir atestado",
  referral: "Solicitar exames",
};

/** Tipo do documento na API (rota e payload). */
const API_KIND: Record<DocumentKind, ClinicalDocumentKind> = {
  prescription: "prescription",
  certificate: "medical-certificate",
  referral: "exam-referral",
};

interface ItemRow {
  name: string;
  quantity: string;
  instructions: string;
}

const emptyRow = (): ItemRow => ({ name: "", quantity: "", instructions: "" });

/** Remove os campos vazios — o backend só aceita o que foi preenchido. */
function toPayloadItem(row: ItemRow) {
  return {
    name: row.name.trim(),
    ...(row.quantity.trim() ? { quantity: row.quantity.trim() } : {}),
    ...(row.instructions.trim()
      ? { instructions: row.instructions.trim() }
      : {}),
  };
}

function toReferralItem(row: ItemRow) {
  return {
    name: row.name.trim(),
    ...(row.quantity.trim() ? { tussCode: row.quantity.trim() } : {}),
    ...(row.instructions.trim()
      ? { observation: row.instructions.trim() }
      : {}),
  };
}

/**
 * Documentos emitidos durante o atendimento: receita, atestado e solicitação
 * de exames. O PDF é gerado no servidor e já entra na aba Documentos — aqui só
 * abrimos o arquivo pronto em outra aba para o médico imprimir ou enviar.
 *
 * **Emitir** persiste a ficha antes (`ensureRecordId`): o documento é um
 * registro do atendimento, e o PDF sai da ficha gravada — inclusive de um CID
 * recém-digitado. Quem sabe resolver isso é a casca do atendimento.
 *
 * **Visualizar** não grava nada, nem a ficha. O servidor monta o mesmo HTML a
 * partir do paciente e dos campos que estão na tela. Antes, a prévia também
 * chamava `ensureRecordId` e criava um prontuário vazio só porque o médico
 * quis conferir a receita — o banner "nada foi salvo" mentia, e a consulta
 * ficava com ficha vinculada (logo, não excluível).
 */
export function ClinicalDocumentActions({
  ensureRecordId,
  onEmitted,
  cidCodes,
  patientId,
  doctorId,
  dadosFabricados,
}: {
  ensureRecordId: () => Promise<string>;
  onEmitted: (document: GeneratedClinicalDocument) => void;
  /** CIDs da ficha — sugestão inicial do atestado e base da prévia. */
  cidCodes: ClinicalCidCode[];
  /** Paciente do atendimento; é o que a prévia usa no lugar da ficha. */
  patientId: string;
  /** Médico que assina o documento. */
  doctorId: string;
  /**
   * Marca que o atendimento em tela é o fabricado do tour. Bloqueia a
   * emissão por PROVENIÊNCIA do dado, não pelo estado do tour — sair do tour
   * na página sentinela não pode reabilitar a emissão real.
   */
  dadosFabricados?: boolean;
}) {
  const [openKind, setOpenKind] = useState<DocumentKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const { emTour } = useOnboarding();
  const bloqueado = emTour || dadosFabricados;

  // Receita e exames compartilham a mesma lista repetível.
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [notes, setNotes] = useState("");

  // Atestado
  const [restDays, setRestDays] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [includeCid, setIncludeCid] = useState(false);
  const [certificateCid, setCertificateCid] = useState<ClinicalCidCode[]>([]);
  const [observations, setObservations] = useState("");

  const closePreview = () => setPreviewHtml(null);

  const openModal = (kind: DocumentKind) => {
    setRows([emptyRow()]);
    setNotes("");
    setRestDays("1");
    setStartDate("");
    setIncludeCid(false);
    // Começa com o CID da ficha; o médico troca se o afastamento for por outro
    // motivo.
    setCertificateCid(cidCodes.slice(0, 1));
    setObservations("");
    setError(null);
    setOpenKind(kind);
  };

  const closeModal = () => {
    if (submitting || previewing) return;
    setOpenKind(null);
  };

  const updateRow = (index: number, patch: Partial<ItemRow>) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const filledRows = rows.filter((row) => row.name.trim());

  /** Payload do documento aberto, montado sobre o alvo (ficha ou paciente). */
  const buildPayload = (target: ClinicalDocumentTarget) => {
    if (openKind === "prescription") {
      return {
        ...target,
        items: filledRows.map(toPayloadItem),
        notes: notes.trim() || undefined,
      };
    }
    if (openKind === "certificate") {
      const days = Number(restDays);
      return {
        ...target,
        restDays: Number.isFinite(days) && days > 0 ? days : undefined,
        startDate: startDate || undefined,
        includeCid: includeCid || undefined,
        cid: includeCid ? certificateCid[0] : undefined,
        observations: observations.trim() || undefined,
      };
    }
    return {
      ...target,
      exams: filledRows.map(toReferralItem),
      clinicalIndication: notes.trim() || undefined,
    };
  };

  /**
   * Alvo da prévia: o paciente e os CIDs que estão na tela — nunca a ficha,
   * que a prévia não pode criar nem alterar. A receita não imprime CID, então
   * não os manda (o payload é validado em modo estrito no servidor).
   */
  const previewTarget = (): ClinicalDocumentTarget => ({
    patientId,
    doctorId,
    ...(openKind !== "prescription" && cidCodes.length ? { cidCodes } : {}),
  });

  /** Valida o mínimo comum a emitir e pré-visualizar. */
  const isIncomplete = (): boolean => {
    if (openKind !== "certificate" && filledRows.length === 0) {
      setError(
        openKind === "prescription"
          ? "Informe ao menos um medicamento."
          : "Informe ao menos um exame.",
      );
      return true;
    }
    return false;
  };

  const handlePreview = async () => {
    setError(null);
    if (isIncomplete()) return;

    setPreviewing(true);
    try {
      const html = await clinicalRecordService.previewDocument(
        API_KIND[openKind!],
        buildPayload(previewTarget()) as never,
      );
      setPreviewHtml(html);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível gerar a prévia."));
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (isIncomplete()) return;

    setSubmitting(true);
    try {
      const clinicalRecordId = await ensureRecordId();
      const payload = buildPayload({ clinicalRecordId });

      let document: GeneratedClinicalDocument;
      if (openKind === "prescription") {
        document = await clinicalRecordService.generatePrescription(
          payload as never,
        );
      } else if (openKind === "certificate") {
        document = await clinicalRecordService.generateMedicalCertificate(
          payload as never,
        );
      } else {
        document = await clinicalRecordService.generateExamReferral(
          payload as never,
        );
      }

      window.open(document.uri, "_blank", "noopener");
      onEmitted(document);
      closePreview();
      setOpenKind(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível emitir o documento."));
    } finally {
      setSubmitting(false);
    }
  };

  const isList = openKind === "prescription" || openKind === "referral";
  const itemLabel = openKind === "prescription" ? "Medicamento" : "Exame";

  return (
    <>
      <div
        data-tour="ficha-documentos"
        className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm"
      >
        <p className="text-sm font-semibold text-neutral-900 mb-1">
          Documentos do atendimento
        </p>
        <p className="text-xs text-neutral-500 mb-3">
          O documento emitido é salvo no prontuário e abre em uma nova aba.
        </p>
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl min-h-[44px] justify-center"
            onClick={() => openModal("prescription")}
          >
            <FileText className="w-4 h-4 mr-2" />
            Receita
          </Button>
          <Button
            variant="outline"
            className="rounded-xl min-h-[44px] justify-center"
            onClick={() => openModal("certificate")}
          >
            <Stethoscope className="w-4 h-4 mr-2" />
            Atestado
          </Button>
          <Button
            variant="outline"
            className="rounded-xl min-h-[44px] justify-center"
            onClick={() => openModal("referral")}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Solicitar exames
          </Button>
        </div>
      </div>

      <Modal
        isOpen={openKind !== null}
        onClose={closeModal}
        title={openKind ? MODAL_TITLE[openKind] : ""}
        size="lg"
      >
        <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
          {isList && (
            <>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-100 p-3"
                >
                  <Input
                    id={`clinical-doc-item-${index}`}
                    label={`${itemLabel} ${index + 1}`}
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder={
                      openKind === "prescription"
                        ? "Ex.: Dipirona 500mg"
                        : "Ex.: Ressonância de joelho direito"
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {openKind === "prescription" ? (
                      <Input
                        id={`clinical-doc-qty-${index}`}
                        label="Quantidade"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(index, { quantity: e.target.value })
                        }
                        placeholder="1 caixa"
                      />
                    ) : (
                      <TussCodePicker
                        id={`clinical-doc-tuss-${index}`}
                        label="Código TUSS"
                        value={row.quantity}
                        onChange={({ tussCode, name }) =>
                          // Escolher no catálogo já nomeia o exame; digitar o
                          // código à mão não sobrescreve o que foi escrito.
                          updateRow(index, {
                            quantity: tussCode,
                            ...(name ? { name } : {}),
                          })
                        }
                      />
                    )}
                    <Input
                      id={`clinical-doc-instructions-${index}`}
                      label={
                        openKind === "prescription"
                          ? "Posologia"
                          : "Observação do exame"
                      }
                      value={row.instructions}
                      onChange={(e) =>
                        updateRow(index, { instructions: e.target.value })
                      }
                      placeholder={
                        openKind === "prescription"
                          ? "1 comprimido a cada 8h por 5 dias"
                          : "Avaliar menisco medial"
                      }
                    />
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="self-end text-xs font-medium text-red-600 hover:underline min-h-[44px] px-2"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="self-start text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
              >
                {openKind === "prescription"
                  ? "+ Adicionar medicamento"
                  : "+ Adicionar exame"}
              </button>

              <Textarea
                id="clinical-doc-notes"
                label={
                  openKind === "prescription"
                    ? "Orientações gerais"
                    : "Indicação clínica"
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  openKind === "prescription"
                    ? "Orientações impressas ao final da receita"
                    : "Justificativa clínica exigida pelo convênio"
                }
              />
            </>
          )}

          {openKind === "certificate" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="clinical-doc-rest-days"
                  label="Dias de afastamento"
                  type="number"
                  min={1}
                  max={365}
                  value={restDays}
                  onChange={(e) => setRestDays(e.target.value)}
                />
                <Input
                  id="clinical-doc-start-date"
                  label="Início do afastamento"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={includeCid}
                    onCheckedChange={setIncludeCid}
                    aria-label="Incluir CID no atestado"
                  />
                  <span className="text-sm text-neutral-700">
                    Incluir CID no atestado (exige autorização do paciente)
                  </span>
                </div>

                {includeCid && (
                  <div className="pl-1">
                    <CidPicker
                      value={certificateCid}
                      // Um atestado carrega um diagnóstico só; trocar substitui.
                      onChange={(codes) => setCertificateCid(codes.slice(-1))}
                    />
                  </div>
                )}
              </div>

              <Textarea
                id="clinical-doc-observations"
                label="Observações"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <ModalFooter align="end" className="flex-wrap">
          <Button
            variant="outline"
            onClick={closeModal}
            disabled={submitting || previewing}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            isLoading={previewing}
            disabled={submitting || bloqueado}
            className="min-h-[44px]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={previewing || bloqueado}
            className="min-h-[44px]"
          >
            Emitir
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={previewHtml !== null}
        onClose={closePreview}
        title="Prévia do documento"
        size="xl"
      >
        <div className="px-4 md:px-6 py-4 flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            Esta é a prévia — nada foi salvo no prontuário ainda. Feche para
            ajustar ou use Emitir para registrar o documento.
          </p>
          {previewHtml && (
            <div className="max-h-[55vh] md:max-h-[65vh] overflow-auto rounded-xl border border-neutral-200 p-3 md:p-6">
              <DocumentPreview html={previewHtml} />
            </div>
          )}
        </div>

        <ModalFooter align="end" className="flex-wrap">
          <Button
            variant="outline"
            onClick={closePreview}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Voltar e ajustar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={bloqueado}
            className="min-h-[44px]"
          >
            Emitir
          </Button>
        </ModalFooter>
      </Modal>

    </>
  );
}
