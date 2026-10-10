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
import { getApiErrorMessage, getTransitionBlockError } from "@/lib/http-error";
import { SurgeryRequestStatusCode } from "@/lib/surgery-request-status";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import {
  NotificationConfirmModal,
  type NotificationChannels,
} from "./NotificationConfirmModal";
import {
  buildInitialSelectedOpmeSuppliers,
  buildSupplierAuthorizationPayload,
  buildSupplierOptions,
  describeSelectedSupplier,
} from "./fornecedor-vencedor";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { ContestFlow, ContestMethod, ContestStep } from "./ContestFlow";
import {
  AuthorizationEntry,
  AuthorizationTable,
  SummaryTable,
} from "./AuthorizationTables";

type Step = 1 | 2 | 3 | 4;

interface UpdateAuthorizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

export function UpdateAuthorizationsModal({
  isOpen,
  onClose,
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
    { date: "", time: "" },
    { date: "", time: "" },
    { date: "", time: "" },
  ]);
  const [scheduleAttempted, setScheduleAttempted] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const [showContest, setShowContest] = useState(false);
  const [contestStep, setContestStep] = useState<ContestStep>(1);
  const [contestReason, setContestReason] = useState("");
  const [contestMethod, setContestMethod] = useState<ContestMethod>("email");
  const [contestEmail, setContestEmail] = useState({
    to: "",
    subject: `Contestação de autorizações - ${solicitacao?.patient?.name ?? ""}`,
    message: "",
    cc: "",
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
      cc: "",
    });
    setContestAttachments([]);
    setScheduleDates([
      { date: "", time: "" },
      { date: "", time: "" },
      { date: "", time: "" },
    ]);
    setScheduleAttempted(false);
    setIsNotificationModalOpen(false);
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
      ...buildSupplierAuthorizationPayload(
        selectedOpmeSuppliers[String(e.id)],
      ),
    }));

  const hasPatientContact =
    !!solicitacao?.patient?.phone || !!solicitacao?.patient?.email;

  const buildDateOptions = () =>
    scheduleDates
      .filter((d) => d.date.trim() !== "" && d.time.trim() !== "")
      .map((d) => new Date(`${d.date}T${d.time}:00`).toISOString());

  const submitAcceptAuthorization = async (
    channels: NotificationChannels | null,
  ) => {
    setIsSaving(true);
    try {
      await surgeryRequestService.authorizeQuantities(
        solicitacao.id,
        tussAuth.map((e) => ({
          id: e.id,
          authorizedQuantity: Number(e.authorizedQuantity) || 0,
        })),
        mapOpmeAuthorizationPayload(),
      );

      const shouldNotifySchedulingOptions =
        channels !== null &&
        channels.whatsapp &&
        !!solicitacao?.patient?.phone;

      const dateOptions = buildDateOptions();
      const payload: AcceptAuthorizationPayload = {
        ...(dateOptions.length > 0 ? { dateOptions } : {}),
        ...(shouldNotifySchedulingOptions && dateOptions.length > 0
          ? { notifyPatient: true }
          : {}),
      };
      await surgeryRequestService.acceptAuthorization(solicitacao.id, payload);

      let notifyError: string | null = null;
      if (channels?.email && solicitacao?.patient?.email) {
        try {
          await surgeryRequestService.notify(solicitacao.id, {
            template: "status-change-patient",
            channels: { email: true, whatsapp: false },
            oldStatus: SurgeryRequestStatusCode.IN_ANALYSIS,
          });
        } catch (e) {
          notifyError = getApiErrorMessage(e, "falha no envio do e-mail");
        }
      }

      if (notifyError) {
        showToast(
          `Autorização aceita, mas o paciente não foi notificado: ${notifyError}`,
          "warning",
        );
      } else {
        showToast("Autorização aceita! Status: Em Agendamento", "success");
      }
      reset();
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ?? "Erro ao aceitar autorização. Tente novamente.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccept = () => {
    const hasPartial = scheduleDates.some(
      (d) => (d.date.trim() !== "") !== (d.time.trim() !== ""),
    );
    if (hasPartial) {
      setScheduleAttempted(true);
      showToast(
        "Preencha data e horário juntos em cada opção, ou deixe a opção vazia.",
        "error",
      );
      return;
    }

    if (hasPatientContact && buildDateOptions().length > 0) {
      setIsNotificationModalOpen(true);
      return;
    }

    void submitAcceptAuthorization(null);
  };

  const handleSchedulingNotificationConfirm = (
    channels: NotificationChannels | null,
  ) => {
    setIsNotificationModalOpen(false);
    void submitAcceptAuthorization(channels);
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
          ...(contestEmail.cc && { cc: contestEmail.cc }),
        }),
      };
      await surgeryRequestService.contestAuthorization(solicitacao.id, payload);

      let pdfFailed = false;
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
          pdfFailed = true;
        }
      }

      if (pdfFailed) {
        showToast(
          "Contestação registrada, mas houve um erro ao gerar o PDF.",
          "warning",
        );
      } else {
        showToast("Contestação enviada com sucesso", "success");
      }
      reset();
      onSuccess();
    } catch (e) {
      showToast(
        getApiErrorMessage(e, "Erro ao enviar contestação. Tente novamente."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

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

        {showContest && (
          <ContestFlow
            step={contestStep}
            reason={contestReason}
            method={contestMethod}
            emailForm={contestEmail}
            attachments={contestAttachments}
            isSaving={isSaving}
            surgeryRequestId={solicitacao.id}
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
            <ModalFooter align="end">
              <button onClick={handleClose} className="ds-btn-outline">
                Cancelar
              </button>
              <button onClick={() => setStep(2)} className="ds-btn-primary">
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

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
                  getSupplierOptions={(item) =>
                    buildSupplierOptions(
                      solicitacao.opmeItems?.find((o) => o.id === item.id),
                    )
                  }
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
            <ModalFooter align="end">
              <button onClick={() => setStep(1)} className="ds-btn-outline">
                Voltar
              </button>
              <button onClick={() => setStep(3)} className="ds-btn-primary">
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

        {!showContest && step === 3 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
              <div className="flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-xl">
                <p className="text-sm md:text-base text-blue-600 leading-normal">
                  Revise os itens autorizados pelo convênio e escolha como
                  prosseguir: aceite para propor datas de agendamento, conteste
                  se as autorizações estiverem incorretas ou encerre a
                  solicitação.
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
                      const selectedSupplierLabel = describeSelectedSupplier(
                        opme,
                        selectedOpmeSuppliers[String(e.id)],
                      );

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

        {!showContest && step === 4 && (
          <>
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-5 overflow-y-auto">
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
                  Informe até{" "}
                  <strong className="font-semibold">3 opções</strong> de data e
                  horário. Elas são{" "}
                  <strong className="font-semibold">opcionais</strong> — você
                  pode defini-las depois, já em Agendamento. O paciente escolherá
                  a que melhor se encaixa na sua agenda.
                </p>
              </div>

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
                  const dateVal = scheduleDates[index].date;
                  const timeVal = scheduleDates[index].time;
                  const filled = dateVal !== "" && timeVal !== "";
                  const dateError =
                    scheduleAttempted && dateVal === "" && timeVal !== "";
                  const timeError =
                    scheduleAttempted && timeVal === "" && dateVal !== "";
                  const hasError = dateError || timeError;
                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors duration-200 ${
                        hasError
                          ? "border-red-300 bg-red-50/30"
                          : filled
                            ? "border-primary-200 bg-primary-50/30"
                            : "border-neutral-100 bg-white"
                      }`}
                    >
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

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className={`text-xs font-medium ${dateError ? "text-red-500" : "text-gray-500"}`}>
                            Data{dateError && " *"}
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
                            className={`ds-input ${dateError ? "border-red-400 focus:ring-red-400" : ""}`}
                          />
                          {dateError && (
                            <p className="text-xs text-red-500">Obrigatório</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={`text-xs font-medium ${timeError ? "text-red-500" : "text-gray-500"}`}>
                            Horário{timeError && " *"}
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
                            className={`ds-input ${timeError ? "border-red-400 focus:ring-red-400" : ""}`}
                          />
                          {timeError && (
                            <p className="text-xs text-red-500">Obrigatório</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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

    <NotificationConfirmModal
      isOpen={isNotificationModalOpen && hasPatientContact}
      onClose={() => {
        if (!isSaving) setIsNotificationModalOpen(false);
      }}
      currentStatus="Em Análise"
      newStatus="Em Agendamento"
      onConfirm={handleSchedulingNotificationConfirm}
      isLoading={isSaving}
      patientEmail={solicitacao?.patient?.email}
      patientPhone={solicitacao?.patient?.phone}
    />
    </>
  );
}
