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
import { Modal } from "@/components/ui/Modal";
import {
  NotificationConfirmModal,
  type NotificationChannels,
} from "./NotificationConfirmModal";
import {
  buildInitialSelectedOpmeSuppliers,
  buildSupplierAuthorizationPayload,
  buildSupplierOptions,
} from "./fornecedor-vencedor";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { ContestFlow, ContestMethod, ContestStep } from "./ContestFlow";
import { AuthorizationEntry, AuthorizationTable } from "./AuthorizationTables";
import { AuthorizationSummaryStep } from "./AuthorizationSummaryStep";
import {
  ScheduleDateOption,
  SchedulingOptionsStep,
} from "./SchedulingOptionsStep";

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

  const [scheduleDates, setScheduleDates] = useState<ScheduleDateOption[]>([
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
      ...buildSupplierAuthorizationPayload(selectedOpmeSuppliers[String(e.id)]),
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
        channels !== null && channels.whatsapp && !!solicitacao?.patient?.phone;

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
        getTransitionBlockError(err) ??
          "Erro ao aceitar autorização. Tente novamente.",
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

  const title = showContest
    ? "Contestar Autorizações"
    : step === 4
      ? "Agendamento"
      : step === 3
        ? "Autorizações - Resumo"
        : "Autorizações";

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (showContest) {
    body = (
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
        onNext={() => setContestStep((s) => Math.min(3, s + 1) as ContestStep)}
        onBack={() => {
          if (contestStep === 1) {
            setShowContest(false);
          } else {
            setContestStep((s) => Math.max(1, s - 1) as ContestStep);
          }
        }}
        onSubmit={handleContest}
      />
    );
  } else if (step === 1) {
    body = (
      <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 ">
        <p className="text-sm md:text-base font-semibold text-gray-900">
          Código TUSS
        </p>
        <AuthorizationTable
          items={tussAuth}
          labelHeader="Procedimento"
          renderLabel={(item) => {
            const proc = solicitacao.tussItems?.find((p) => p.id === item.id);
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
    );
    footer = (
      <ModalFooter align="end">
        <button onClick={handleClose} className="ds-btn-outline">
          Cancelar
        </button>
        <button onClick={() => setStep(2)} className="ds-btn-primary">
          Próximo
        </button>
      </ModalFooter>
    );
  } else if (step === 2) {
    body = (
      <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
        <p className="text-sm md:text-base font-semibold text-gray-900">OPME</p>
        {opmeAuth.length > 0 ? (
          <AuthorizationTable
            items={opmeAuth}
            labelHeader="Descrição"
            renderLabel={(item) => {
              const opme = solicitacao.opmeItems?.find((o) => o.id === item.id);
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
    );
    footer = (
      <ModalFooter align="end">
        <button onClick={() => setStep(1)} className="ds-btn-outline">
          Voltar
        </button>
        <button onClick={() => setStep(3)} className="ds-btn-primary">
          Próximo
        </button>
      </ModalFooter>
    );
  } else if (step === 3) {
    body = (
      <AuthorizationSummaryStep
        solicitacao={solicitacao}
        tussAuth={tussAuth}
        opmeAuth={opmeAuth}
        selectedOpmeSuppliers={selectedOpmeSuppliers}
      />
    );
    footer = (
      <ModalFooter align="end" className="border-t-2">
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
          <button onClick={() => setStep(4)} className="flex-1 ds-btn-outline">
            Aceitar
          </button>
        )}
      </ModalFooter>
    );
  } else {
    body = (
      <SchedulingOptionsStep
        dates={scheduleDates}
        attempted={scheduleAttempted}
        onChange={setScheduleDates}
      />
    );
    footer = (
      <ModalFooter align="end">
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
      </ModalFooter>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        disableClose={isSaving}
        footer={footer}
      >
        {body}
      </Modal>

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
