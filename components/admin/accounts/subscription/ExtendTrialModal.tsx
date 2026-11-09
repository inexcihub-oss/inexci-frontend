"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DatePickerPopover } from "@/components/ui/DatePickerPopover";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { adminService } from "@/services/admin.service";
import { cn, formatDate } from "@/lib/utils";
import { ReasonField } from "./ReasonField";
import { validateReason } from "./reason";
import { useSubscriptionAction } from "./useSubscriptionAction";

const SHORTCUTS = [7, 15, 30];
const DAY_MS = 86_400_000;

type Choice = { kind: "days"; days: number } | { kind: "date"; date: Date };

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  trialEndsAt: string | null;
  hasGatewaySubscription: boolean;
}

export function ExtendTrialModal({
  isOpen,
  onClose,
  ownerId,
  trialEndsAt,
  hasGatewaySubscription,
}: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () =>
      adminService.extendTrial(ownerId, {
        reason: reason.trim(),
        ...(choice?.kind === "days"
          ? { days: choice.days }
          : { until: choice ? toISODate(choice.date) : undefined }),
      }),
    "Trial estendido.",
    onClose,
  );

  const reasonError = submitted ? validateReason(reason) : null;

  let newEnd: Date | null = null;
  let choiceError: string | null = null;
  if (choice?.kind === "days") {
    const base = Math.max(
      trialEndsAt ? new Date(trialEndsAt).getTime() : 0,
      Date.now(),
    );
    newEnd = new Date(base + choice.days * DAY_MS);
  } else if (choice?.kind === "date") {
    newEnd = choice.date;
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (choice.date.getTime() < tomorrow.getTime()) {
      choiceError = "A data precisa ser a partir de amanhã.";
    }
  }

  const handleConfirm = () => {
    setSubmitted(true);
    if (!choice || choiceError || validateReason(reason)) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estender trial"
      size="sm"
      disableClose={mutation.isPending}
      footer={
        <ModalFooter align="end">
          <SpinnerButton
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            onClick={handleConfirm}
            isLoading={mutation.isPending}
            loadingText="Estendendo..."
          >
            Confirmar
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <div>
          <p className="ds-label">Estender por</p>
          <div className="flex flex-wrap items-center gap-2">
            {SHORTCUTS.map((days) => {
              const selected = choice?.kind === "days" && choice.days === days;
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    clearError();
                    setChoice({ kind: "days", days });
                  }}
                  className={cn(
                    "min-h-[40px] rounded-xl border px-3 text-sm font-semibold",
                    selected
                      ? "border-teal-700 bg-teal-50 text-teal-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  +{days} dias
                </button>
              );
            })}
            <DatePickerPopover
              value={choice?.kind === "date" ? choice.date : null}
              onChange={(date) => {
                clearError();
                setChoice({ kind: "date", date });
              }}
              trigger={
                <button
                  type="button"
                  aria-pressed={choice?.kind === "date"}
                  className={cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold",
                    choice?.kind === "date"
                      ? "border-teal-700 bg-teal-50 text-teal-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {choice?.kind === "date"
                    ? formatDate(choice.date)
                    : "Escolher data"}
                </button>
              }
            />
          </div>
          {submitted && !choice && (
            <p className="mt-1 text-xs text-red-600">
              Escolha por quanto tempo estender.
            </p>
          )}
          {choiceError && (
            <p className="mt-1 text-xs text-red-600">{choiceError}</p>
          )}
        </div>

        {newEnd && !choiceError && (
          <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Novo término do trial:{" "}
            <strong data-testid="novo-termino">{formatDate(newEnd)}</strong>
          </p>
        )}

        <ReasonField
          id="extend-trial-reason"
          value={reason}
          onChange={(v) => {
            clearError();
            setReason(v);
          }}
          error={reasonError}
        />

        {hasGatewaySubscription && (
          <p className="text-xs text-gray-500">
            A alteração é feita na Stripe e no Inexci e fica registrada no
            histórico.
          </p>
        )}

        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
