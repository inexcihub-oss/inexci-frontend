"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { getTransitionBlockError } from "@/lib/http-error";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from "@/lib/file-upload";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import {
  IconCalendar,
  IconCheckCircle,
  IconXCircle,
} from "./SurgeryStatusIcons";
import {
  DocSection,
  SurgeryDocumentSections,
  UploadFile,
  genId,
  mkSections,
} from "./SurgeryDocumentSections";
import { SurgeryRescheduleFields } from "./SurgeryRescheduleFields";

type SurgeryOutcome = "realizada" | "cancelada" | "reagendada";

interface SurgeryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

export function SurgeryStatusModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: SurgeryStatusModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [outcome, setOutcome] = useState<SurgeryOutcome | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [sections, setSections] = useState<DocSection[]>(mkSections);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const reset = () => {
    setStep(1);
    setOutcome(null);
    setNewDate("");
    setNewTime("10:00");
    setSections(mkSections());
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const addFiles = (key: string, fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const allFiles = Array.from(fl);
    const valid = allFiles.filter(
      (f) => f.size <= MAX_DOCUMENT_FILE_SIZE_BYTES,
    );
    const oversized = allFiles.filter(
      (f) => f.size > MAX_DOCUMENT_FILE_SIZE_BYTES,
    );
    if (oversized.length > 0) {
      showToast(
        `${oversized.length} arquivo(s) ignorado(s): cada arquivo deve ter no máximo ${MAX_DOCUMENT_FILE_SIZE_MB}MB`,
        "error",
      );
    }
    if (valid.length === 0) return;
    const incoming: UploadFile[] = valid.map((f) => ({
      id: genId(),
      file: f,
      progress: 0,
      uploading: false,
    }));
    setSections((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        return s.multiple
          ? { ...s, files: [...s.files, ...incoming] }
          : { ...s, files: [incoming[0]] };
      }),
    );
  };

  const removeFile = (key: string, id: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, files: s.files.filter((f) => f.id !== id) } : s,
      ),
    );
  };

  const submitRealizada = async () => {
    if (!solicitacao.surgeryDate) {
      showToast("Data da cirurgia agendada não encontrada.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const allFiles = sections.flatMap((s) =>
        s.files.map((f, idx) => {
          const ext = f.file.name.match(/(\.[^.]+)$/)?.[1] ?? "";
          const docName =
            s.files.length > 1
              ? `${s.label} ${idx + 1}${ext}`
              : `${s.label}${ext}`;
          return { ...f, sectionKey: s.key, docName };
        }),
      );

      for (const { id, file, sectionKey, docName } of allFiles) {
        setSections((prev) =>
          prev.map((s) =>
            s.key === sectionKey
              ? {
                  ...s,
                  files: s.files.map((f) =>
                    f.id === id ? { ...f, uploading: true } : f,
                  ),
                }
              : s,
          ),
        );

        await documentService.upload({
          surgeryRequestId: solicitacao.id,
          key: sectionKey,
          name: docName,
          file,
          folder: DOCUMENT_FOLDERS.POST_SURGERY,
          onUploadProgress: (pct) => {
            setSections((prev) =>
              prev.map((s) =>
                s.key === sectionKey
                  ? {
                      ...s,
                      files: s.files.map((f) =>
                        f.id === id ? { ...f, progress: pct } : f,
                      ),
                    }
                  : s,
              ),
            );
          },
        });
      }

      await surgeryRequestService.markPerformed(solicitacao.id, {
        surgeryPerformedAt: solicitacao.surgeryDate,
      });

      showToast("Cirurgia marcada como Realizada!", "success");
      reset();
      onClose();
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ??
          "Erro ao enviar documentos. Tente novamente.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const submitReagendada = async () => {
    if (!newDate) {
      showToast("Selecione a nova data da cirurgia.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const iso = new Date(`${newDate}T${newTime || "00:00"}:00`).toISOString();
      await surgeryRequestService.reschedule(solicitacao.id, { newDate: iso });
      showToast("Cirurgia reagendada com sucesso.", "success");
      reset();
      onClose();
      onSuccess();
    } catch {
      showToast("Erro ao reagendar. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const submitCancelada = async () => {
    setIsSaving(true);
    try {
      await surgeryRequestService.close(solicitacao.id, {
        reason: "Cirurgia cancelada",
      });
      showToast("Solicitação encerrada — cirurgia cancelada.", "success");
      reset();
      onClose();
      onSuccess();
    } catch {
      showToast("Erro ao cancelar. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const title =
    step === 1
      ? "Status da cirurgia"
      : outcome === "realizada"
        ? "Cirurgia realizada"
        : outcome === "reagendada"
          ? "Cirurgia reagendada"
          : "Cirurgia cancelada";

  const backButton = (
    <button
      onClick={() => setStep(1)}
      disabled={isSaving}
      className="ds-btn-outline disabled:opacity-50"
    >
      Voltar
    </button>
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === 1) {
    body = (
      <div className="flex flex-col gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-6">
        <p className="text-xs md:text-sm text-neutral-900">
          Qual o status atual da cirurgia?
        </p>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {(
            [
              {
                value: "realizada" as SurgeryOutcome,
                label: "Realizada",
                icon: <IconCheckCircle />,
              },
              {
                value: "cancelada" as SurgeryOutcome,
                label: "Cancelada",
                icon: <IconXCircle />,
              },
              {
                value: "reagendada" as SurgeryOutcome,
                label: "Reagendada",
                icon: <IconCalendar />,
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 md:p-4 border rounded-xl transition-colors ${
                outcome === opt.value
                  ? "border-teal-700"
                  : "border-neutral-100 hover:border-neutral-200"
              }`}
            >
              {opt.icon}
              <span className="text-xs font-semibold text-neutral-900 text-center leading-tight">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
    footer = (
      <ModalFooter align="end">
        <button onClick={handleClose} className="ds-btn-outline">
          Cancelar
        </button>
        <button
          onClick={() => {
            if (!outcome) {
              showToast("Selecione o status da cirurgia.", "error");
              return;
            }
            setStep(2);
          }}
          className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </ModalFooter>
    );
  } else if (outcome === "realizada") {
    body = (
      <div className="flex flex-col gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-6">
        <p className="text-xs md:text-sm text-neutral-900">
          Anexe os documentos cirúrgicos, se desejar.
        </p>

        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-blue-700 leading-relaxed">
            Todos os documentos inseridos aqui irão compor o documento final
            para faturamento.
          </p>
        </div>

        <SurgeryDocumentSections
          sections={sections}
          isSaving={isSaving}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
        />
      </div>
    );
    footer = (
      <ModalFooter align="end">
        {backButton}
        <button
          onClick={submitRealizada}
          disabled={isSaving}
          className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? "Finalizando..." : "Finalizar"}
        </button>
      </ModalFooter>
    );
  } else if (outcome === "reagendada") {
    body = (
      <SurgeryRescheduleFields
        newDate={newDate}
        newTime={newTime}
        onDateChange={setNewDate}
        onTimeChange={setNewTime}
      />
    );
    footer = (
      <ModalFooter align="end">
        {backButton}
        <button
          onClick={submitReagendada}
          disabled={isSaving}
          className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? "Reagendando..." : "Confirmar"}
        </button>
      </ModalFooter>
    );
  } else if (outcome === "cancelada") {
    body = (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <p className="text-xs md:text-sm text-neutral-900">
          Tem certeza que deseja encerrar a solicitação e marcá-la como
          cancelada?
        </p>
      </div>
    );
    footer = (
      <ModalFooter align="end">
        <button
          onClick={handleClose}
          disabled={isSaving}
          className="ds-btn-outline disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={submitCancelada}
          disabled={isSaving}
          className="ds-btn-danger disabled:opacity-50"
        >
          {isSaving ? "Encerrando..." : "Encerrar"}
        </button>
      </ModalFooter>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      disableClose={isSaving}
      footer={footer}
    >
      {body}
    </Modal>
  );
}
