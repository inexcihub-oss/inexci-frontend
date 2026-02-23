"use client";

import React, { useState, useCallback } from "react";
import {
  surgeryRequestService,
  AcceptAuthorizationPayload,
  ContestAuthorizationPayload,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

// ─── Tipos ────────────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type ContestStep = 1 | 2 | 3;
type ContestMethod = "email" | "document";

interface AuthorizationEntry {
  id: string;
  quantity: number;
  authorized_quantity: string;
}

interface UpdateAuthorizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClose2: () => void;
  solicitacao: any;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────────

function getSummaryRowBg(authorized: number | null, requested: number): string {
  if (authorized === null) return "";
  if (authorized === 0) return "bg-rose-50/50";
  if (authorized < requested) return "bg-amber-50/60";
  return "bg-emerald-50/70";
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
    (solicitacao?.procedures ?? []).map((p: any) => ({
      id: p.id,
      quantity: p.quantity ?? 1,
      authorized_quantity:
        p.authorized_quantity != null
          ? String(p.authorized_quantity)
          : String(p.quantity ?? 1),
    })),
  );

  const [opmeAuth, setOpmeAuth] = useState<AuthorizationEntry[]>(() =>
    (solicitacao?.opme_items ?? []).map((o: any) => ({
      id: o.id,
      quantity: o.quantity ?? 1,
      authorized_quantity:
        o.authorized_quantity != null
          ? String(o.authorized_quantity)
          : String(o.quantity ?? 1),
    })),
  );

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
    subject: "",
    message: "",
  });

  const { showToast } = useToast();

  const reset = useCallback(() => {
    setStep(1);
    setShowContest(false);
    setContestStep(1);
    setContestReason("");
    setContestEmail({ to: "", subject: "", message: "" });
    setScheduleDates([
      { date: "", time: "00:00" },
      { date: "", time: "00:00" },
      { date: "", time: "00:00" },
    ]);
    setTussAuth(
      (solicitacao?.procedures ?? []).map((p: any) => ({
        id: p.id,
        quantity: p.quantity ?? 1,
        authorized_quantity:
          p.authorized_quantity != null
            ? String(p.authorized_quantity)
            : String(p.quantity ?? 1),
      })),
    );
    setOpmeAuth(
      (solicitacao?.opme_items ?? []).map((o: any) => ({
        id: o.id,
        quantity: o.quantity ?? 1,
        authorized_quantity:
          o.authorized_quantity != null
            ? String(o.authorized_quantity)
            : String(o.quantity ?? 1),
      })),
    );
  }, [solicitacao]);

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const hasSomeAuthorization =
    tussAuth.some((e) => e.authorized_quantity !== "") ||
    opmeAuth.some((e) => e.authorized_quantity !== "");

  const hasPartialOrRejected = [...tussAuth, ...opmeAuth].some((e) => {
    const auth = Number(e.authorized_quantity);
    return e.authorized_quantity !== "" && (auth === 0 || auth < e.quantity);
  });

  const canAccept = scheduleDates.some((d) => d.date.trim() !== "");

  const handleAccept = async () => {
    setIsSaving(true);
    try {
      // 1. Salvar quantidades autorizadas no banco antes de aceitar
      await surgeryRequestService.authorizeQuantities(
        solicitacao.id,
        tussAuth.map((e) => ({
          id: e.id,
          authorized_quantity: Number(e.authorized_quantity) || 0,
        })),
        opmeAuth.map((e) => ({
          id: e.id,
          authorized_quantity: Number(e.authorized_quantity) || 0,
        })),
      );

      // 2. Aceitar autorizacao e propor datas
      // 1. Salvar quantidades autorizadas no banco antes de aceitar
      await surgeryRequestService.authorizeQuantities(
        solicitacao.id,
        tussAuth.map((e) => ({
          id: e.id,
          authorized_quantity: Number(e.authorized_quantity) || 0,
        })),
        opmeAuth.map((e) => ({
          id: e.id,
          authorized_quantity: Number(e.authorized_quantity) || 0,
        })),
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
        date_options: validDates,
      };
      await surgeryRequestService.acceptAuthorization(solicitacao.id, payload);
      showToast("Autorização aceita! Status: Em Agendamento", "success");
      reset();
      onSuccess();
    } catch {
      showToast("Erro ao aceitar autorização. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContest = async () => {
    if (!contestReason.trim()) return;
    setIsSaving(true);
    try {
      const payload: ContestAuthorizationPayload = {
        reason: contestReason.trim(),
        method: contestMethod,
        ...(contestMethod === "email" && {
          to: contestEmail.to,
          subject: contestEmail.subject,
          message: contestEmail.message,
        }),
      };
      await surgeryRequestService.contestAuthorization(solicitacao.id, payload);
      showToast("Contestação enviada com sucesso", "success");
      reset();
      onSuccess();
    } catch {
      showToast("Erro ao enviar contestação. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ maxHeight: "100vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200 shrink-0">
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

        {/* Contestação */}
        {showContest && (
          <ContestFlow
            step={contestStep}
            reason={contestReason}
            method={contestMethod}
            emailForm={contestEmail}
            isSaving={isSaving}
            onReasonChange={setContestReason}
            onMethodChange={setContestMethod}
            onEmailChange={(field, val) =>
              setContestEmail((prev) => ({ ...prev, [field]: val }))
            }
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
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">
              <p className="text-base font-semibold text-gray-900">
                Código TUSS
              </p>
              <AuthorizationTable
                items={tussAuth}
                labelHeader="Procedimento"
                renderLabel={(item) => {
                  const proc = solicitacao.procedures?.find(
                    (p: any) => p.id === item.id,
                  );
                  return `${proc?.procedure?.tuss_code ?? ""} — ${proc?.procedure?.name ?? ""}`;
                }}
                onChange={(id, val) =>
                  setTussAuth((prev) =>
                    prev.map((e) =>
                      e.id === id ? { ...e, authorized_quantity: val } : e,
                    ),
                  )
                }
              />
            </div>
            <ModalFooter className="justify-end">
              <button
                onClick={handleClose}
                className="h-10 px-4 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors"
              >
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

        {/* Etapa 2: OPME */}
        {!showContest && step === 2 && (
          <>
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">
              <p className="text-base font-semibold text-gray-900">OPME</p>
              {opmeAuth.length > 0 ? (
                <AuthorizationTable
                  items={opmeAuth}
                  labelHeader="Descrição"
                  renderLabel={(item) => {
                    const opme = solicitacao.opme_items?.find(
                      (o: any) => o.id === item.id,
                    );
                    return opme?.name ?? item.id;
                  }}
                  onChange={(id, val) =>
                    setOpmeAuth((prev) =>
                      prev.map((e) =>
                        e.id === id ? { ...e, authorized_quantity: val } : e,
                      ),
                    )
                  }
                />
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nenhum item OPME nesta solicitação.
                </p>
              )}
            </div>
            <ModalFooter className="justify-end">
              <button
                onClick={() => setStep(1)}
                className="h-10 px-4 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors"
              >
                Próximo
              </button>
            </ModalFooter>
          </>
        )}

        {/* Etapa 3: Resumo */}
        {!showContest && step === 3 && (
          <>
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-base text-blue-600 leading-normal">
                  O médico responsável pela solicitação deve selecionar como
                  deseja prosseguir com a solicitação com base nos itens
                  autorizados.
                </p>
              </div>
              {tussAuth.length > 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-base font-semibold text-gray-900">
                    Código TUSS
                  </p>
                  <SummaryTable
                    labelHeader="Procedimento"
                    items={tussAuth.map((e) => {
                      const proc = solicitacao.procedures?.find(
                        (p: any) => p.id === e.id,
                      );
                      return {
                        label: `${proc?.procedure?.tuss_code ?? ""} — ${proc?.procedure?.name ?? ""}`,
                        requested: e.quantity,
                        authorized:
                          e.authorized_quantity !== ""
                            ? Number(e.authorized_quantity)
                            : null,
                      };
                    })}
                  />
                </div>
              )}
              {opmeAuth.length > 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-base font-semibold text-gray-900">OPME</p>
                  <SummaryTable
                    labelHeader="Descrição"
                    items={opmeAuth.map((e) => {
                      const opme = solicitacao.opme_items?.find(
                        (o: any) => o.id === e.id,
                      );
                      return {
                        label: opme?.name ?? e.id,
                        requested: e.quantity,
                        authorized:
                          e.authorized_quantity !== ""
                            ? Number(e.authorized_quantity)
                            : null,
                      };
                    })}
                  />
                </div>
              )}
            </div>
            <div className="flex items-stretch gap-2 px-6 py-4 border-t-2 border-gray-200 shrink-0">
              <button
                onClick={() =>
                  surgeryRequestService
                    .close(solicitacao.id)
                    .then(onSuccess)
                    .catch(() => showToast("Erro ao encerrar", "error"))
                }
                className="flex-1 h-10 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Encerrar solicitação
              </button>
              {hasPartialOrRejected && (
                <button
                  onClick={() => setShowContest(true)}
                  className="flex-1 h-10 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Contestar
                </button>
              )}
              {hasSomeAuthorization && (
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 h-10 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
            <div className="flex flex-col gap-4 px-6 py-6 overflow-y-auto">
              {/* Caixa de informação */}
              <div className="flex items-center bg-blue-50 rounded-lg p-4">
                <p className="text-base text-blue-600 leading-normal">
                  Selecione 3 opções para o agendamento do paciente. Após
                  selecionadas o paciente poderá escolher a melhor opção.
                </p>
              </div>

              {/* Linhas de opção */}
              <div className="flex flex-col">
                {(
                  [
                    { label: "1ª Opção" },
                    { label: "2ª Opção" },
                    { label: "3ª Opção" },
                  ] as const
                ).map(({ label }, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 py-3 pl-2 pr-4"
                  >
                    <span className="flex-1 text-sm font-semibold text-gray-900">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Campo de data */}
                      <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 w-44">
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
                          className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent outline-none"
                        />
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0 opacity-50"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <rect
                            x="1.5"
                            y="2.5"
                            width="13"
                            height="12"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M1.5 6.5H14.5"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M5 1V4M11 1V4"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      {/* Campo de hora */}
                      <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2">
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
                          className="text-sm text-gray-900 bg-transparent outline-none w-20"
                        />
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0 opacity-50"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <circle
                            cx="8"
                            cy="8"
                            r="6.5"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M8 4.5V8L10.5 10"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
              <button
                onClick={() => setStep(3)}
                className="h-10 px-4 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccept}
                disabled={!canAccept || isSaving}
                className={`h-10 px-6 text-sm font-semibold rounded-lg transition-colors ${
                  canAccept && !isSaving
                    ? "bg-teal-700 text-white hover:bg-teal-800"
                    : "bg-gray-100 text-gray-900 opacity-50 cursor-not-allowed"
                }`}
              >
                {isSaving ? "Enviando..." : "Enviar"}
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
      className={`flex items-center gap-2 px-6 py-4 border-t-2 border-gray-200 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}

interface AuthorizationTableProps {
  items: AuthorizationEntry[];
  labelHeader: string;
  renderLabel: (item: AuthorizationEntry) => string;
  onChange: (id: string, value: string) => void;
}

function AuthorizationTable({
  items,
  labelHeader,
  renderLabel,
  onChange,
}: AuthorizationTableProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
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
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0"
        >
          <span className="flex-1 text-sm text-gray-900 leading-snug">
            {renderLabel(item)}
          </span>
          <div className="w-24 flex justify-center">
            <div className="w-14 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
              {item.quantity}
            </div>
          </div>
          <div className="w-24 flex justify-center">
            <input
              type="number"
              min="0"
              value={item.authorized_quantity}
              onChange={(e) => onChange(item.id, e.target.value)}
              className="w-14 h-10 text-sm font-semibold text-gray-900 text-center border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white appearance-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SummaryTableProps {
  labelHeader: string;
  items: { label: string; requested: number; authorized: number | null }[];
}

function SummaryTable({ labelHeader, items }: SummaryTableProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
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
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0 ${getSummaryRowBg(item.authorized, item.requested)}`}
        >
          <span className="flex-1 text-sm text-gray-900 leading-snug">
            {item.label}
          </span>
          <div className="w-24 flex justify-center">
            <div className="w-14 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
              {item.requested}
            </div>
          </div>
          <div className="w-24 flex justify-center">
            <div className="w-14 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
              {item.authorized ?? "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Fluxo de contestação ─────────────────────────────────────────────────────

interface ContestFlowProps {
  step: ContestStep;
  reason: string;
  method: ContestMethod;
  emailForm: { to: string; subject: string; message: string };
  isSaving: boolean;
  onReasonChange: (v: string) => void;
  onMethodChange: (v: ContestMethod) => void;
  onEmailChange: (field: "to" | "subject" | "message", v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

function ContestFlow({
  step,
  reason,
  method,
  emailForm,
  isSaving,
  onReasonChange,
  onMethodChange,
  onEmailChange,
  onNext,
  onBack,
  onSubmit,
}: ContestFlowProps) {
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canProceedStep1 = reason.trim().length > 0;
  const canSubmit =
    method === "email"
      ? emailForm.to.trim() !== "" && emailForm.subject.trim() !== ""
      : true;

  return (
    <>
      {/* Body */}
      <div className="flex flex-col gap-4 p-6 overflow-y-auto">
        {/* Etapa 1: Motivo da contestação */}
        {step === 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-900">
              Motivo da contestação
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Digite o motivo"
              className="w-full px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
          </div>
        )}

        {/* Etapa 2: Método de envio */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-base text-neutral-900">
              Como deseja enviar a solicitação?
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => onMethodChange("document")}
                className={`flex items-center gap-4 p-6 border rounded-lg text-left transition-colors ${
                  method === "document"
                    ? "border-teal-600 bg-teal-50"
                    : "border-neutral-100 hover:border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-center w-7 h-7 shrink-0">
                  <svg
                    className="w-6 h-6 text-neutral-900"
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
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-light tracking-tight text-neutral-900">
                    Criar documento
                  </span>
                  <span className="text-sm text-neutral-200">
                    Crie um arquivo PDF com contestação + anexos
                  </span>
                </div>
              </button>

              <button
                onClick={() => onMethodChange("email")}
                className={`flex items-center gap-4 p-6 border rounded-lg text-left transition-colors ${
                  method === "email"
                    ? "border-teal-600 bg-teal-50"
                    : "border-neutral-100 hover:border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-center w-7 h-7 shrink-0">
                  <svg
                    className="w-6 h-6 text-neutral-900"
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
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-light tracking-tight text-neutral-900">
                    Enviar por e-mail
                  </span>
                  <span className="text-sm text-neutral-200">
                    Envie a contestação diretamente por e-mail
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3a: Formulário de e-mail */}
        {step === 3 && method === "email" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                De:
              </label>
              <input
                type="text"
                defaultValue="inexci@mail.com"
                disabled
                className="w-full px-3 py-2 text-sm text-neutral-200 bg-white border border-neutral-100 rounded-lg disabled:opacity-70 cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Para:
              </label>
              <p className="text-sm text-neutral-200 leading-tight">
                Para incluir mais de um e-mail separe-os com ponto e vírgula (;)
              </p>
              <input
                type="email"
                value={emailForm.to}
                onChange={(e) => onEmailChange("to", e.target.value)}
                placeholder="autorizacoes@unimed.com.br"
                className="w-full px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Assunto:
              </label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => onEmailChange("subject", e.target.value)}
                placeholder="Contestação de autorizações - Maria Silva Santos"
                className="w-full px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Mensagem de contestação:
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => onEmailChange("message", e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                className="w-full px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Documento de contestação
              </label>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-lg">
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
                <span className="flex-1 text-sm font-semibold text-neutral-900 truncate">
                  {attachedFile ? attachedFile.name : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && setAttachedFile(e.target.files[0])
                  }
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-4 text-sm text-neutral-900 bg-white border border-neutral-100 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Selecionar arquivo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3b: Documento PDF */}
        {step === 3 && method === "document" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Mensagem de contestação:
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => onEmailChange("message", e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={8}
                className="w-full px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-200 bg-white border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-900">
                Documento de contestação
              </label>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-lg">
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
                <span className="flex-1 text-sm font-semibold text-neutral-900 truncate">
                  {attachedFile ? attachedFile.name : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && setAttachedFile(e.target.files[0])
                  }
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-4 text-sm text-neutral-900 bg-white border border-neutral-100 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Selecionar arquivo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter className="justify-end">
        <button
          onClick={onBack}
          className="h-10 px-4 text-sm text-neutral-900 bg-white border border-neutral-100 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {step < 3 ? "Cancelar" : "Voltar"}
        </button>
        {step < 3 ? (
          <button
            onClick={onNext}
            disabled={step === 1 && !canProceedStep1}
            className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isSaving}
            className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
