"use client";

import React, { useState, useCallback } from "react";
import {
  surgeryRequestService,
  AcceptAuthorizationPayload,
  ContestAuthorizationPayload,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

// ─── Tipos ────────────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type ContestStep = 1 | 2 | 3;
type ContestMethod = "email" | "document";

interface AuthorizationEntry {
  id: string | number;
  quantity: number;
  authorizedQuantity: string;
}

interface UpdateAuthorizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClose2: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

interface SupplierSelectOption {
  value: string;
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────────

function getSummaryRowStyles(
  authorized: number | null,
  requested: number,
): { row: string; authorizedBox: string } {
  if (authorized === null) {
    return {
      row: "",
      authorizedBox: "bg-white border-gray-200 text-gray-500",
    };
  }

  if (authorized === 0) {
    return {
      row: "bg-rose-100/90 border-l-4 border-l-rose-500",
      authorizedBox: "bg-rose-50 border-rose-300 text-rose-700",
    };
  }

  if (authorized < requested) {
    return {
      row: "bg-amber-100/90 border-l-4 border-l-amber-500",
      authorizedBox: "bg-amber-50 border-amber-300 text-amber-700",
    };
  }

  return {
    row: "bg-emerald-100/90 border-l-4 border-l-emerald-500",
    authorizedBox: "bg-emerald-50 border-emerald-300 text-emerald-700",
  };
}

function getSupplierOptionValue(supplier: {
  id?: string | number;
  name?: string;
}): string {
  if (supplier.id != null) return String(supplier.id);
  return supplier.name?.trim() ? `name:${supplier.name.trim()}` : "";
}

function getSelectedSupplierIdFromValue(value?: string): string | undefined {
  if (!value || value.startsWith("name:")) return undefined;
  return value;
}

function buildInitialSelectedOpmeSuppliers(
  solicitacao: SurgeryRequestDetail,
): Record<string, string> {
  const initial: Record<string, string> = {};

  (solicitacao?.opmeItems ?? []).forEach((item) => {
    const selectedSupplierValue = item.selectedSupplier?.id
      ? String(item.selectedSupplier.id)
      : item.selectedSupplierId
        ? String(item.selectedSupplierId)
        : "";

    if (selectedSupplierValue) {
      initial[String(item.id)] = selectedSupplierValue;
      return;
    }

    const firstSupplier = (item.suppliers ?? []).find(
      (supplier) => !!getSupplierOptionValue(supplier),
    );
    if (firstSupplier) {
      initial[String(item.id)] = getSupplierOptionValue(firstSupplier);
    }
  });

  return initial;
}

// ─── Componente principal ─────────────────────────────────────────────────────────────

export function UpdateAuthorizationsModal({
  isOpen,
  onClose,
  onClose2: _onClose2,
  solicitacao,
  onSuccess,
}: UpdateAuthorizationsModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);

  const [tussAuth, setTussAuth] = useState<AuthorizationEntry[]>(() =>
    (solicitacao?.tussItems ?? []).map((p) => ({
      id: p.id,
      quantity: p.quantity ?? 1,
      authorizedQuantity: String(p.quantity ?? 1),
    })),
  );

  const [opmeAuth, setOpmeAuth] = useState<AuthorizationEntry[]>(() =>
    (solicitacao?.opmeItems ?? []).map((o) => ({
      id: o.id,
      quantity: o.quantity ?? 1,
      authorizedQuantity: String(o.quantity ?? 1),
    })),
  );

  const [selectedOpmeSuppliers, setSelectedOpmeSuppliers] = useState<
    Record<string, string>
  >(() => buildInitialSelectedOpmeSuppliers(solicitacao));

  const [scheduleDates, setScheduleDates] = useState<
    Array<{ date: string; time: string }>
  >([
    { date: "", time: "00:00" },
    { date: "", time: "00:00" },
    { date: "", time: "00:00" },
  ]);

  const [showContest, setShowContest] = useState(false);
  const [contestStep, setContestStep] = useState<ContestStep>(1);
  const [contestReason, setContestReason] = useState("");
  const [contestMethod, setContestMethod] = useState<ContestMethod>("email");
  const [contestEmail, setContestEmail] = useState({
    to: "",
    subject: `Contestação de autorizações - ${solicitacao?.patient?.name ?? ""}`,
    message: "",
  });
  const [contestAttachments, setContestAttachments] = useState<File[]>([]);

  const { showToast } = useToast();

  const reset = useCallback(() => {
    setStep(1);
    setShowContest(false);
    setContestStep(1);
    setContestReason("");
    setContestEmail({
      to: "",
      subject: `Contestação de autorizações - ${solicitacao?.patient?.name ?? ""}`,
      message: "",
    });
    setContestAttachments([]);
    setScheduleDates([
      { date: "", time: "00:00" },
      { date: "", time: "00:00" },
      { date: "", time: "00:00" },
    ]);
    setTussAuth(
      (solicitacao?.tussItems ?? []).map((p) => ({
        id: p.id,
        quantity: p.quantity ?? 1,
        authorizedQuantity: String(p.quantity ?? 1),
      })),
    );
    setOpmeAuth(
      (solicitacao?.opmeItems ?? []).map((o) => ({
        id: o.id,
        quantity: o.quantity ?? 1,
        authorizedQuantity: String(o.quantity ?? 1),
      })),
    );
    setSelectedOpmeSuppliers(buildInitialSelectedOpmeSuppliers(solicitacao));
  }, [solicitacao]);

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(handleClose);

  const hasSomeAuthorization =
    tussAuth.some((e) => e.authorizedQuantity !== "") ||
    opmeAuth.some((e) => e.authorizedQuantity !== "");

  const hasPartialOrRejected = [...tussAuth, ...opmeAuth].some((e) => {
    const auth = Number(e.authorizedQuantity);
    return e.authorizedQuantity !== "" && (auth === 0 || auth < e.quantity);
  });

  const mapOpmeAuthorizationPayload = () =>
    opmeAuth.map((e) => ({
      id: e.id,
      authorizedQuantity: Number(e.authorizedQuantity) || 0,
      selectedSupplierId: getSelectedSupplierIdFromValue(
        selectedOpmeSuppliers[String(e.id)],
      ),
    }));

  const handleAccept = async () => {
    const hasDate = scheduleDates.every((d) => d.date.trim() !== "");
    if (!hasDate) {
      showToast("Preencha as 3 opções de data para o agendamento.", "error");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Salvar quantidades autorizadas no banco antes de aceitar
      await surgeryRequestService.authorizeQuantities(
        solicitacao.id,
        tussAuth.map((e) => ({
          id: e.id,
          authorizedQuantity: Number(e.authorizedQuantity) || 0,
        })),
        mapOpmeAuthorizationPayload(),
      );

      // 2. Aceitar autorizacao e propor datas
      const validDates = scheduleDates
        .filter((d) => d.date.trim() !== "")
        .map((d) => {
          const time = d.time || "00:00";
          const datetime = `${d.date}T${time}:00`;
          return new Date(datetime).toISOString();
        });
      const payload: AcceptAuthorizationPayload = {
        dateOptions: validDates,
      };
      await surgeryRequestService.acceptAuthorization(solicitacao.id, payload);
      showToast("Autorização aceita! Status: Em Agendamento", "success");
      reset();
      onSuccess();
    } catch {
      showToast("Erro ao aceitar autorização. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContest = async () => {
    if (!contestReason.trim()) {
      showToast("Informe o motivo da contestação.", "error");
      return;
    }
    setIsSaving(true);
    try {
      let uploadedAttachmentPaths: string[] = [];
      if (contestAttachments.length > 0) {
        uploadedAttachmentPaths = await Promise.all(
          contestAttachments.map(async (file) => {
            const uploaded = await documentService.upload({
              surgeryRequestId: solicitacao.id,
              key: "contestation_attachment",
              name: file.name,
              file,
              folder: DOCUMENT_FOLDERS.PRE_SURGERY,
            });
            return uploaded.path;
          }),
        );
      }

      // Salvar quantidades autorizadas no banco antes de contestar
      await surgeryRequestService.authorizeQuantities(
        solicitacao.id,
        tussAuth.map((e) => ({
          id: e.id,
          authorizedQuantity: Number(e.authorizedQuantity) || 0,
        })),
        mapOpmeAuthorizationPayload(),
      );

      const payload: ContestAuthorizationPayload = {
        reason: contestReason.trim(),
        method: contestMethod,
        ...(uploadedAttachmentPaths.length > 0 && {
          attachments: uploadedAttachmentPaths,
        }),
        ...(contestMethod === "email" && {
          to: contestEmail.to,
          subject: contestEmail.subject,
          message: contestEmail.message,
        }),
      };
      await surgeryRequestService.contestAuthorization(solicitacao.id, payload);

      if (contestMethod === "document") {
        try {
          const blob =
            await surgeryRequestService.downloadContestAuthorizationPdf(
              solicitacao.id,
            );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `contestacao-${solicitacao.protocol ?? solicitacao.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch {
          showToast(
            "Contestação registrada, mas houve um erro ao gerar o PDF.",
            "error",
          );
        }
      }

      showToast("Contestação enviada com sucesso", "success");
      reset();
      onSuccess();
    } catch {
      showToast("Erro ao enviar contestação. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />
      <div
        className="relative bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-2xl md:mx-4 flex flex-col max-h-[92dvh] md:max-h-[90vh] mobile-sheet-offset"
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Drag handle — apenas mobile */}
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 text-lg font-semibold text-gray-900">
            {showContest
              ? "Contestar Autorizações"
              : step === 4
                ? "Agendamento"
                : step === 3
                  ? "Autorizações - Resumo"
                  : "Autorizações"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Contestação */}
        {showContest && (
          <ContestFlow
            step={contestStep}
            reason={contestReason}
            method={contestMethod}
            emailForm={contestEmail}
            attachments={contestAttachments}
            isSaving={isSaving}
            onReasonChange={setContestReason}
            onMethodChange={setContestMethod}
            onEmailChange={(field, val) =>
              setContestEmail((prev) => ({ ...prev, [field]: val }))
            }
            onAttachmentsChange={setContestAttachments}
            onNext={() =>
              setContestStep((s) => Math.min(3, s + 1) as ContestStep)
            }
            onBack={() => {
              if (contestStep === 1) {
                setShowContest(false);
              } else {
                setContestStep((s) => Math.max(1, s - 1) as ContestStep);
              }
            }}
            onSubmit={handleContest}
          />
        )}

        {/* Etapa 1: TUSS */}
        {!showContest && step === 1 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
              <p className="text-sm md:text-base font-semibold text-gray-900">
                Código TUSS
              </p>
              <AuthorizationTable
                items={tussAuth}
                labelHeader="Procedimento"
                renderLabel={(item) => {
                  const proc = solicitacao.tussItems?.find(
                    (p) => p.id === item.id,
                  );
                  return `${proc?.tussCode ?? ""} — ${proc?.name ?? ""}`;
                }}
                onChange={(id, val) =>
                  setTussAuth((prev) =>
                    prev.map((e) =>
                      e.id === id ? { ...e, authorizedQuantity: val } : e,
                    ),
                  )
                }
              />
            </div>
            <ModalFooter className="justify-end">
              <button onClick={handleClose} className="ds-btn-outline">
                Cancelar
              </button>
              <button onClick={() => setStep(2)} className="ds-btn-primary">
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

        {/* Etapa 2: OPME */}
        {!showContest && step === 2 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
              <p className="text-sm md:text-base font-semibold text-gray-900">
                OPME
              </p>
              {opmeAuth.length > 0 ? (
                <AuthorizationTable
                  items={opmeAuth}
                  labelHeader="Descrição"
                  renderLabel={(item) => {
                    const opme = solicitacao.opmeItems?.find(
                      (o) => o.id === item.id,
                    );
                    return opme?.name ?? String(item.id);
                  }}
                  onChange={(id, val) =>
                    setOpmeAuth((prev) =>
                      prev.map((e) =>
                        e.id === id ? { ...e, authorizedQuantity: val } : e,
                      ),
                    )
                  }
                  getSupplierOptions={(item) => {
                    const opme = solicitacao.opmeItems?.find(
                      (o) => o.id === item.id,
                    );
                    return (opme?.suppliers ?? [])
                      .map((supplier) => ({
                        value: getSupplierOptionValue(supplier),
                        label: supplier.name?.trim() || "Fornecedor sem nome",
                      }))
                      .filter((supplier) => supplier.value !== "");
                  }}
                  getSelectedSupplier={(id) =>
                    selectedOpmeSuppliers[String(id)] ?? ""
                  }
                  onSupplierChange={(id, value) =>
                    setSelectedOpmeSuppliers((prev) => ({
                      ...prev,
                      [String(id)]: value,
                    }))
                  }
                />
              ) : (
                <p className="text-xs md:text-sm text-gray-400 text-center py-6">
                  Nenhum item OPME nesta solicitação.
                </p>
              )}
            </div>
            <ModalFooter className="justify-end">
              <button onClick={() => setStep(1)} className="ds-btn-outline">
                Voltar
              </button>
              <button onClick={() => setStep(3)} className="ds-btn-primary">
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

        {/* Etapa 3: Resumo */}
        {!showContest && step === 3 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
              <div className="flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-xl">
                <p className="text-sm md:text-base text-blue-600 leading-normal">
                  O médico responsável pela solicitação deve selecionar como
                  deseja prosseguir com a solicitação com base nos itens
                  autorizados.
                </p>
              </div>
              {tussAuth.length > 0 && (
                <div className="flex flex-col gap-3 md:gap-4">
                  <p className="text-sm md:text-base font-semibold text-gray-900">
                    Código TUSS
                  </p>
                  <SummaryTable
                    labelHeader="Procedimento"
                    items={tussAuth.map((e) => {
                      const proc = solicitacao.tussItems?.find(
                        (p) => p.id === e.id,
                      );
                      return {
                        label: `${proc?.tussCode ?? ""} — ${proc?.name ?? ""}`,
                        requested: e.quantity,
                        authorized:
                          e.authorizedQuantity !== ""
                            ? Number(e.authorizedQuantity)
                            : null,
                      };
                    })}
                  />
                </div>
              )}
              {opmeAuth.length > 0 && (
                <div className="flex flex-col gap-3 md:gap-4">
                  <p className="text-sm md:text-base font-semibold text-gray-900">
                    OPME
                  </p>
                  <SummaryTable
                    labelHeader="Descrição"
                    items={opmeAuth.map((e) => {
                      const opme = solicitacao.opmeItems?.find(
                        (o) => o.id === e.id,
                      );
                      return {
                        label: opme?.name ?? String(e.id),
                        requested: e.quantity,
                        authorized:
                          e.authorizedQuantity !== ""
                            ? Number(e.authorizedQuantity)
                            : null,
                      };
                    })}
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-600">
                      Fornecedor selecionado
                    </p>
                    {opmeAuth.map((e) => {
                      const opme = solicitacao.opmeItems?.find(
                        (o) => o.id === e.id,
                      );
                      const selectedValue = selectedOpmeSuppliers[String(e.id)];
                      const selectedSupplierLabel =
                        (opme?.suppliers ?? []).find(
                          (supplier) =>
                            getSupplierOptionValue(supplier) === selectedValue,
                        )?.name ??
                        (selectedValue?.startsWith("name:")
                          ? selectedValue.replace("name:", "")
                          : "Não selecionado");

                      return (
                        <div
                          key={e.id}
                          className="flex items-center justify-between gap-3 text-xs md:text-sm"
                        >
                          <span className="text-gray-500 truncate">
                            {opme?.name ?? String(e.id)}
                          </span>
                          <span className="font-medium text-gray-800">
                            {selectedSupplierLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-stretch gap-2 px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200 shrink-0">
              <button
                onClick={() =>
                  surgeryRequestService
                    .close(solicitacao.id)
                    .then(onSuccess)
                    .catch(() => showToast("Erro ao encerrar", "error"))
                }
                className="flex-1 ds-btn-outline"
              >
                Encerrar solicitação
              </button>
              {hasPartialOrRejected && (
                <button
                  onClick={() => setShowContest(true)}
                  className="flex-1 ds-btn-outline"
                >
                  Contestar
                </button>
              )}
              {hasSomeAuthorization && (
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 ds-btn-outline"
                >
                  Aceitar
                </button>
              )}
            </div>
          </>
        )}

        {/* Etapa 4: Agendamento */}
        {!showContest && step === 4 && (
          <>
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-5 overflow-y-auto">
              {/* Banner informativo */}
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Informe{" "}
                  <strong className="font-semibold">exatamente 3 opções</strong>{" "}
                  de data e horário. Todas são obrigatórias. O paciente
                  escolherá a que melhor se encaixa na sua agenda.
                </p>
              </div>

              {/* Cards de opção */}
              <div className="flex flex-col gap-3">
                {(
                  [
                    {
                      label: "1ª opção",
                      sublabel: "Preferencial",
                      color:
                        "text-primary-700 bg-primary-50 border-primary-100",
                    },
                    {
                      label: "2ª opção",
                      sublabel: "Alternativa",
                      color: "text-gray-600 bg-gray-50 border-gray-100",
                    },
                    {
                      label: "3ª opção",
                      sublabel: "Alternativa",
                      color: "text-gray-600 bg-gray-50 border-gray-100",
                    },
                  ] as const
                ).map(({ label, sublabel, color }, index) => {
                  const filled = scheduleDates[index].date !== "";
                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors duration-200 ${
                        filled
                          ? "border-primary-200 bg-primary-50/30"
                          : "border-neutral-100 bg-white"
                      }`}
                    >
                      {/* Cabeçalho do card */}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold border ${color}`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 leading-none">
                            {label}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            {sublabel}
                          </span>
                        </div>
                        {filled && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-100 rounded-full px-2 py-0.5">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Preenchida
                          </span>
                        )}
                      </div>

                      {/* Campos data e hora lado a lado */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500">
                            Data
                          </label>
                          <input
                            type="date"
                            value={scheduleDates[index].date}
                            onChange={(e) => {
                              const next = [...scheduleDates];
                              next[index] = {
                                ...next[index],
                                date: e.target.value,
                              };
                              setScheduleDates(next);
                            }}
                            className="ds-input"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500">
                            Horário
                          </label>
                          <input
                            type="time"
                            value={scheduleDates[index].time}
                            onChange={(e) => {
                              const next = [...scheduleDates];
                              next[index] = {
                                ...next[index],
                                time: e.target.value,
                              };
                              setScheduleDates(next);
                            }}
                            className="ds-input"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 shrink-0">
              <button onClick={() => setStep(3)} className="ds-btn-outline">
                Voltar
              </button>
              <button
                onClick={handleAccept}
                disabled={isSaving}
                className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Enviando..." : "Confirmar agendamento"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────────

function ModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}

interface AuthorizationTableProps {
  items: AuthorizationEntry[];
  labelHeader: string;
  renderLabel: (item: AuthorizationEntry) => string;
  onChange: (id: string | number, value: string) => void;
  getSupplierOptions?: (item: AuthorizationEntry) => SupplierSelectOption[];
  getSelectedSupplier?: (id: string | number) => string;
  onSupplierChange?: (id: string | number, value: string) => void;
}

function AuthorizationTable({
  items,
  labelHeader,
  renderLabel,
  onChange,
  getSupplierOptions,
  getSelectedSupplier,
  onSupplierChange,
}: AuthorizationTableProps) {
  const showSupplierSelect =
    !!getSupplierOptions && !!getSelectedSupplier && !!onSupplierChange;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden">
        <div className="px-4 py-2 border-b border-gray-200">
          <span className="text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
        </div>
        {items.map((item) => {
          const supplierOptions = getSupplierOptions?.(item) ?? [];
          const selectedSupplier = getSelectedSupplier?.(item.id) ?? "";

          return (
            <div
              key={item.id}
              className="px-4 py-3 border-b border-gray-200 last:border-b-0 space-y-2.5"
            >
              <p className="text-sm text-gray-900 leading-snug break-words">
                {renderLabel(item)}
              </p>

              {showSupplierSelect && (
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Fornecedor
                  </label>
                  {supplierOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {supplierOptions.map((supplier) => {
                        const isSelected = selectedSupplier === supplier.value;
                        return (
                          <button
                            key={supplier.value}
                            type="button"
                            onClick={() =>
                              onSupplierChange?.(item.id, supplier.value)
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-xs leading-tight transition-colors ${
                              isSelected
                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            {supplier.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ds-field-readonly text-xs text-gray-400">
                      Sem fornecedores disponíveis
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Solicitada
                  </label>
                  <div className="h-10 flex items-center justify-center border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 bg-white">
                    {item.quantity}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Autorizada
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={item.authorizedQuantity}
                    onChange={(e) => {
                      const rawValue = e.target.value;

                      if (rawValue === "") {
                        onChange(item.id, "");
                        return;
                      }

                      const parsed = Number(rawValue);
                      if (!Number.isFinite(parsed)) return;

                      const clamped = Math.min(
                        item.quantity,
                        Math.max(0, parsed),
                      );
                      onChange(item.id, String(clamped));
                    }}
                    className="ds-input h-10 w-full !px-0 text-center font-semibold appearance-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop/tablet: table (comportamento original) */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 px-4 py-1 border-b border-gray-200">
          <span className="flex-1 text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
          {showSupplierSelect && (
            <div className="w-44 flex justify-center">
              <span className="text-xs text-gray-900 opacity-50 text-center">
                Fornecedor
              </span>
            </div>
          )}
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Solicitada
            </span>
          </div>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Autorizada
            </span>
          </div>
        </div>
        {items.map((item) => {
          const supplierOptions = getSupplierOptions?.(item) ?? [];
          const selectedSupplier = getSelectedSupplier?.(item.id) ?? "";

          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0"
            >
              <span className="flex-1 min-w-0 text-xs md:text-sm text-gray-900 leading-snug break-words">
                {renderLabel(item)}
              </span>
              {showSupplierSelect && (
                <div className="w-44 flex justify-center">
                  <div className="relative w-full">
                    <select
                      value={selectedSupplier}
                      onChange={(e) =>
                        onSupplierChange?.(item.id, e.target.value)
                      }
                      disabled={supplierOptions.length === 0}
                      className="ds-input h-10 w-full pr-8 text-xs md:text-sm appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Selecionar</option>
                      {supplierOptions.map((supplier) => (
                        <option key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
              <div className="w-24 flex justify-center">
                <div className="w-14 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-500">
                  {item.quantity}
                </div>
              </div>
              <div className="w-24 flex justify-center">
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={item.authorizedQuantity}
                  onChange={(e) => {
                    const rawValue = e.target.value;

                    if (rawValue === "") {
                      onChange(item.id, "");
                      return;
                    }

                    const parsed = Number(rawValue);
                    if (!Number.isFinite(parsed)) return;

                    const clamped = Math.min(
                      item.quantity,
                      Math.max(0, parsed),
                    );
                    onChange(item.id, String(clamped));
                  }}
                  className="ds-input w-14 h-10 !px-0 text-center font-semibold appearance-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SummaryTableProps {
  labelHeader: string;
  items: { label: string; requested: number; authorized: number | null }[];
}

function SummaryTable({ labelHeader, items }: SummaryTableProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="md:hidden">
        <div className="px-4 py-2 border-b border-gray-200">
          <span className="text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
        </div>
        {items.map((item, index) => {
          const styles = getSummaryRowStyles(item.authorized, item.requested);

          return (
            <div
              key={index}
              className={`px-4 py-3 border-b border-gray-200 last:border-b-0 space-y-2 ${styles.row}`}
            >
              <p className="text-sm text-gray-900 leading-snug break-words">
                {item.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Solicitada
                  </label>
                  <div className="h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500">
                    {item.requested}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Autorizada
                  </label>
                  <div
                    className={`h-10 flex items-center justify-center border rounded-xl text-sm font-semibold ${styles.authorizedBox}`}
                  >
                    {item.authorized ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="flex items-center gap-2 px-4 py-1 border-b border-gray-200">
          <span className="flex-1 text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Solicitada
            </span>
          </div>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Autorizada
            </span>
          </div>
        </div>
        {items.map((item, index) => {
          const styles = getSummaryRowStyles(item.authorized, item.requested);

          return (
            <div
              key={index}
              className={`flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0 ${styles.row}`}
            >
              <span className="flex-1 text-xs md:text-sm text-gray-900 leading-snug">
                {item.label}
              </span>
              <div className="w-24 flex justify-center">
                <div className="w-14 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-500">
                  {item.requested}
                </div>
              </div>
              <div className="w-24 flex justify-center">
                <div
                  className={`w-14 h-10 flex items-center justify-center border rounded-xl text-xs md:text-sm font-semibold ${styles.authorizedBox}`}
                >
                  {item.authorized ?? "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fluxo de contestação ─────────────────────────────────────────────────────

interface ContestFlowProps {
  step: ContestStep;
  reason: string;
  method: ContestMethod;
  emailForm: { to: string; subject: string; message: string };
  attachments: File[];
  isSaving: boolean;
  onReasonChange: (v: string) => void;
  onMethodChange: (v: ContestMethod) => void;
  onEmailChange: (field: "to" | "subject" | "message", v: string) => void;
  onAttachmentsChange: (files: File[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

function ContestFlow({
  step,
  reason,
  method,
  emailForm,
  attachments,
  isSaving,
  onReasonChange,
  onMethodChange,
  onEmailChange,
  onAttachmentsChange,
  onNext,
  onBack,
  onSubmit,
}: ContestFlowProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Tag input para campo Para
  const [toTags, setToTags] = React.useState<string[]>([]);
  const [toInput, setToInput] = React.useState("");
  const [formTouched, setFormTouched] = React.useState(false);

  const addToTag = (email: string) => {
    const trimmed = email.trim().replace(/[;,]$/, "");
    if (trimmed && !toTags.includes(trimmed)) {
      const newTags = [...toTags, trimmed];
      setToTags(newTags);
      onEmailChange("to", newTags.join(";"));
    }
    setToInput("");
  };

  const removeToTag = (tag: string) => {
    const newTags = toTags.filter((t) => t !== tag);
    setToTags(newTags);
    onEmailChange("to", newTags.join(";"));
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (toInput.trim()) addToTag(toInput);
    } else if (e.key === "Backspace" && !toInput && toTags.length > 0) {
      const newTags = toTags.slice(0, -1);
      setToTags(newTags);
      onEmailChange("to", newTags.join(";"));
    }
  };

  const canProceedStep1 = reason.trim().length > 0;
  const canSubmit =
    method === "email"
      ? toTags.length > 0 && emailForm.subject.trim() !== ""
      : true;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const incoming = Array.from(e.target.files);
    const valid = incoming.filter((f) => f.size <= 1 * 1024 * 1024);
    const oversized = incoming.filter((f) => f.size > 1 * 1024 * 1024);
    if (oversized.length > 0) {
      showToast(
        `${oversized.length} arquivo(s) ignorado(s): cada arquivo deve ter no máximo 1MB`,
        "error",
      );
    }
    if (valid.length > 0) {
      onAttachmentsChange([...attachments, ...valid]);
    }
    e.target.value = "";
  };

  const removeAttachmentAt = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Body */}
      <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
        {/* Etapa 1: Motivo da contestação */}
        {step === 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Motivo da contestação</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Descreva detalhadamente o motivo da contestação..."
              rows={6}
              className="ds-textarea"
            />
          </div>
        )}

        {/* Etapa 2: Método de envio */}
        {step === 2 && (
          <div className="flex flex-col gap-3 md:gap-4">
            <p className="ds-body text-gray-600">
              Como deseja enviar a solicitação?
            </p>
            <div className="flex flex-col gap-3 md:gap-4">
              <button
                onClick={() => onMethodChange("document")}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-colors ${
                  method === "document"
                    ? "border-teal-500 bg-teal-50"
                    : "border-neutral-100 bg-white hover:border-neutral-200"
                }`}
              >
                <div className="shrink-0">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 3v13M12 16l-4-4M12 16l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="ds-section-title">Criar documento</span>
                  <span className="ds-caption mt-0.5">
                    Crie um arquivo PDF com contestação + anexos
                  </span>
                </div>
              </button>

              <button
                onClick={() => onMethodChange("email")}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-colors ${
                  method === "email"
                    ? "border-teal-500 bg-teal-50"
                    : "border-neutral-100 bg-white hover:border-neutral-200"
                }`}
              >
                <div className="shrink-0">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="ds-section-title">Enviar por e-mail</span>
                  <span className="ds-caption mt-0.5">
                    Envie a contestação diretamente por e-mail
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3a: Formulário de e-mail */}
        {step === 3 && method === "email" && (
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">De:</label>
              <input
                type="text"
                value={
                  process.env.NEXT_PUBLIC_MAIL_FROM_ADDRESS ||
                  "noreply@inexci.com.br"
                }
                disabled
                readOnly
                className="ds-input disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100 cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Para:</label>
              <p className="text-xs text-gray-400">
                Digite um e-mail e pressione Enter para adicionar
              </p>
              <div
                className={`flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border bg-white min-h-10 cursor-text ${
                  formTouched && toTags.length === 0
                    ? "border-red-400"
                    : "border-neutral-100"
                }`}
                onClick={() =>
                  document.getElementById("contest-email-input-update")?.focus()
                }
              >
                {toTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs md:text-sm text-gray-900"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeToTag(tag)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  id="contest-email-input-update"
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  onBlur={() => {
                    if (toInput.trim()) addToTag(toInput);
                  }}
                  placeholder={
                    toTags.length === 0 ? "exemplo@mail.com" : undefined
                  }
                  className="flex-1 min-w-24 text-xs md:text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
                />
              </div>
              {formTouched && toTags.length === 0 && (
                <p className="text-xs text-red-500">
                  Informe pelo menos um destinatário
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Assunto:</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => onEmailChange("subject", e.target.value)}
                placeholder="Contestação de autorizações - Maria Silva Santos"
                className={`ds-input ${formTouched && !emailForm.subject.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {formTouched && !emailForm.subject.trim() && (
                <p className="text-xs text-red-500">Preencha o assunto</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">
                Mensagem do corpo do e-mail:
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => onEmailChange("message", e.target.value)}
                placeholder="Digite a mensagem do corpo do e-mail..."
                rows={4}
                className="ds-textarea"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Documento de contestação</label>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
                <div className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-100 rounded-full shrink-0">
                  <svg
                    className="w-5 h-5 text-neutral-900"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate">
                  {attachments.length > 0
                    ? `${attachments.length} anexo(s) selecionado(s)`
                    : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn-outline"
                >
                  Selecionar arquivo
                </button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between text-xs text-neutral-600"
                    >
                      <span className="truncate pr-2">{file.name}</span>
                      <button
                        type="button"
                        className="text-neutral-500 hover:text-neutral-700"
                        onClick={() => removeAttachmentAt(index)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Etapa 3b: Documento PDF */}
        {step === 3 && method === "document" && (
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">
                Documento de contestação (opcional)
              </label>
              <p className="text-xs text-gray-500">
                Você pode gerar o PDF sem anexar documentos.
              </p>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
                <div className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-100 rounded-full shrink-0">
                  <svg
                    className="w-5 h-5 text-neutral-900"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate">
                  {attachments.length > 0
                    ? `${attachments.length} anexo(s) selecionado(s)`
                    : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn-outline"
                >
                  Selecionar arquivo
                </button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between text-xs text-neutral-600"
                    >
                      <span className="truncate pr-2">{file.name}</span>
                      <button
                        type="button"
                        className="text-neutral-500 hover:text-neutral-700"
                        onClick={() => removeAttachmentAt(index)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter className="justify-end">
        <button onClick={onBack} className="ds-btn-outline">
          {step < 3 ? "Cancelar" : "Voltar"}
        </button>
        {step < 3 ? (
          <button
            onClick={onNext}
            disabled={step === 1 && !canProceedStep1}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={() => {
              if (!canSubmit) {
                setFormTouched(true);
                return;
              }
              onSubmit();
            }}
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving
              ? "Enviando..."
              : method === "email"
                ? "Enviar e-mail"
                : "Exportar PDF"}
          </button>
        )}
      </ModalFooter>
    </>
  );
}
