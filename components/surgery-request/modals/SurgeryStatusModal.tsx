"use client";

import React, { useState, useRef } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SurgeryOutcome = "realizada" | "cancelada" | "reagendada";

interface SurgeryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
  notifyPatient?: boolean;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  uploading: boolean;
}

interface DocSection {
  key: string;
  label: string;
  optional: boolean;
  required: boolean;
  multiple: boolean;
  files: UploadFile[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function mkSections(): DocSection[] {
  return [
    {
      key: "surgery_room",
      label: "Descrição cirúrgica (Folha de sala)",
      optional: false,
      required: true,
      multiple: false,
      files: [],
    },
    {
      key: "surgery_images",
      label: "Imagens",
      optional: false,
      required: true,
      multiple: true,
      files: [],
    },
    {
      key: "surgery_auth_document",
      label: "Documento de autorização",
      optional: false,
      required: true,
      multiple: false,
      files: [],
    },
    {
      key: "additional_document",
      label: "Outros",
      optional: true,
      required: false,
      multiple: true,
      files: [],
    },
  ];
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IconX({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M18 6L6 18M6 6L18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 12L10.8 14.5L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 9L15 15M15 9L9 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 2V6M8 2V6M3 9H21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12.5" r="1" fill="currentColor" />
      <circle cx="17.5" cy="12.5" r="1" fill="currentColor" />
      <circle cx="6.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7V12L15 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

/**
 * Modal "Status da Cirurgia" — SCHEDULED (5) → PERFORMED (6) / CLOSED (9) / reagendar.
 *
 * Passo 1: Escolher desfecho (Realizada / Cancelada / Reagendada).
 * Passo 2a (Realizada):  Upload de documentos cirúrgicos → markPerformed.
 * Passo 2b (Reagendada): Selecionar nova data/hora → reschedule.
 * Passo 2c (Cancelada):  Confirmação → close.
 */
export function SurgeryStatusModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
  notifyPatient = false,
}: SurgeryStatusModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [outcome, setOutcome] = useState<SurgeryOutcome | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [sections, setSections] = useState<DocSection[]>(mkSections);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Reset ──────────────────────────────────────────────────────────────────

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

  // ── Gerenciamento de arquivos ──────────────────────────────────────────────

  const addFiles = (key: string, fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const incoming: UploadFile[] = Array.from(fl).map((f) => ({
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

  // ── Validações ────────────────────────────────────────────────────────────

  const canSendRealizada = sections
    .filter((s) => s.required)
    .every((s) => s.files.length > 0);

  const canSendReagendada = newDate.trim() !== "";

  // ── Submit: Realizada ──────────────────────────────────────────────────────

  const submitRealizada = async () => {
    if (!canSendRealizada) return;
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
          surgery_request_id: solicitacao.id,
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
        surgery_performed_at: new Date().toISOString(),
        notify_patient: notifyPatient || undefined,
      });

      showToast("Cirurgia marcada como Realizada!", "success");
      reset();
      onClose();
      onSuccess();
    } catch {
      showToast("Erro ao enviar documentos. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit: Reagendada ─────────────────────────────────────────────────────

  const submitReagendada = async () => {
    if (!newDate) return;
    setIsSaving(true);
    try {
      const iso = new Date(`${newDate}T${newTime || "00:00"}:00`).toISOString();
      await surgeryRequestService.reschedule(solicitacao.id, { new_date: iso });
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

  // ── Submit: Cancelada ──────────────────────────────────────────────────────

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

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Título do modal ────────────────────────────────────────────────────────

  const title =
    step === 1
      ? "Status da cirurgia"
      : outcome === "realizada"
        ? "Cirurgia realizada"
        : outcome === "reagendada"
          ? "Cirurgia reagendada"
          : "Cirurgia cancelada";

  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-6 md:py-4 border-b border-neutral-100">
          <h2 className="flex-1 text-2xl font-light tracking-tight text-neutral-900">
            {title}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-6 h-6 flex items-center justify-center text-neutral-900 hover:opacity-70 disabled:opacity-40"
          >
            <IconX />
          </button>
        </div>

        {/* ══════════ PASSO 1: Status da cirurgia ════════════════════════════ */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-6">
              <p className="text-sm md:text-base text-neutral-900">
                Qual o status atual da cirurgia?
              </p>

              <div className="flex gap-3 md:gap-4">
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
                    className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl transition-colors ${
                      outcome === opt.value
                        ? "border-teal-700"
                        : "border-neutral-100 hover:border-neutral-200"
                    }`}
                  >
                    {opt.icon}
                    <span className="text-xs md:text-sm font-semibold text-neutral-900">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100">
              <button onClick={handleClose} className="ds-btn-outline">
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!outcome}
                className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </>
        )}

        {/* ══════════ PASSO 2a: Cirurgia Realizada ═══════════════════════════ */}
        {step === 2 && outcome === "realizada" && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-6">
              <p className="text-sm md:text-base text-neutral-900">
                Envie os documentos cirúrgicos para confirmar a realização.
              </p>

              <div className="flex flex-col gap-3 md:gap-4">
                {sections.map((sec) => (
                  <div key={sec.key}>
                    {/* Input oculto para seleção de arquivo */}
                    <input
                      ref={(el) => {
                        fileRefs.current[sec.key] = el;
                      }}
                      type="file"
                      multiple={sec.multiple}
                      className="hidden"
                      onChange={(e) => {
                        addFiles(sec.key, e.target.files);
                        e.target.value = "";
                      }}
                    />

                    {sec.files.length === 0 ? (
                      /* ── Sem arquivo: container pontilhado ── */
                      <div className="flex items-center gap-2 pl-4 pr-2 py-2 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
                        <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900">
                          {sec.label}
                          {sec.optional && (
                            <span className="font-normal"> (Opcional)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => fileRefs.current[sec.key]?.click()}
                          className="ds-btn-outline flex-shrink-0"
                        >
                          Selecionar arquivo
                        </button>
                      </div>
                    ) : (
                      /* ── Com arquivos: linhas de arquivo ── */
                      <div className="flex flex-col gap-2">
                        {/* Cabeçalho: label + "Adicionar arquivo" */}
                        <div className="flex items-center">
                          <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900">
                            {sec.label}
                            {sec.optional && (
                              <span className="font-normal"> (Opcional)</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => fileRefs.current[sec.key]?.click()}
                            className="text-xs md:text-sm text-neutral-900 underline"
                          >
                            Adicionar arquivo
                          </button>
                        </div>

                        {/* Linhas de arquivo */}
                        {sec.files.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center gap-2 px-4 py-2 border border-neutral-100 rounded-xl"
                          >
                            <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate min-w-0">
                              {f.file.name}{" "}
                              <span className="font-normal text-neutral-200">
                                ({formatSize(f.file.size)})
                              </span>
                            </span>

                            {/* Barra de progresso (durante upload) */}
                            {isSaving && f.uploading && f.progress < 100 && (
                              <div className="w-28 h-3 bg-neutral-50 rounded-full overflow-hidden flex-shrink-0 border border-neutral-100">
                                <div
                                  className="h-full bg-teal-700 rounded-full transition-all duration-300"
                                  style={{ width: `${f.progress}%` }}
                                />
                              </div>
                            )}

                            {/* Botão remover */}
                            <button
                              type="button"
                              onClick={() => removeFile(sec.key, f.id)}
                              disabled={isSaving}
                              className="w-6 h-6 flex items-center justify-center text-neutral-900 hover:opacity-70 disabled:opacity-40 flex-shrink-0"
                            >
                              <IconX size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100">
              <button
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={submitRealizada}
                disabled={!canSendRealizada || isSaving}
                className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </>
        )}

        {/* ══════════ PASSO 2b: Cirurgia Reagendada ══════════════════════════ */}
        {step === 2 && outcome === "reagendada" && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-6">
              <p className="text-sm md:text-base text-neutral-900">
                Confirme a nova data da cirurgia.
              </p>

              {/* Linha: Nova data */}
              <div className="flex items-center gap-2 pl-2 pr-4 py-2">
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900">
                  Nova data
                </span>

                <div className="flex items-center gap-2">
                  {/* Seletor de data */}
                  <div className="relative flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded">
                    <span
                      className={`text-xs md:text-sm text-neutral-900 select-none ${!newDate ? "opacity-50" : ""}`}
                    >
                      {newDate
                        ? new Date(`${newDate}T00:00`).toLocaleDateString(
                            "pt-BR",
                          )
                        : "Selecione uma data"}
                    </span>
                    <span className="opacity-50 flex-shrink-0 text-neutral-900">
                      <IconCalendar size={16} />
                    </span>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  {/* Seletor de hora */}
                  <div className="flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="text-xs md:text-sm text-neutral-900 bg-transparent outline-none w-16"
                    />
                    <span className="opacity-50 flex-shrink-0 text-neutral-900">
                      <IconClock size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitReagendada}
                disabled={!canSendReagendada || isSaving}
                className={`ds-btn-primary disabled:cursor-not-allowed ${
                  canSendReagendada && !isSaving ? "" : "opacity-40"
                }`}
              >
                {isSaving ? "Reagendando..." : "Reagendar"}
              </button>
            </div>
          </>
        )}

        {/* ══════════ PASSO 2c: Cirurgia Cancelada ═══════════════════════════ */}
        {step === 2 && outcome === "cancelada" && (
          <>
            <div className="px-4 py-4 md:px-6 md:py-6">
              <p className="text-sm md:text-base text-neutral-900">
                Tem certeza que deseja encerrar a solicitação e marcá-la como
                cancelada?
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
