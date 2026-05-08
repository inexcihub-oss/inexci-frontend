"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import type { ToastType } from "@/types/toast.types";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import { consentService } from "@/services/consent.service";
import {
  CONSENT_SLUG_BY_TYPE,
  type ConsentStatus,
  type ConsentType,
  type LegalDocument,
} from "@/types/consent.types";
import { MarkdownContent } from "./MarkdownContent";

interface ConsentOnboardingModalProps {
  consents: ConsentStatus[];
  onCompleted: () => Promise<void> | void;
}

type StepKey = ConsentType | "ai-choice";

interface Step {
  key: StepKey;
  type: ConsentType | null;
  required: boolean;
  title: string;
  shortTitle: string;
  status: ConsentStatus | null;
}

const STEP_SLUG_PATH: Record<string, string> = {
  "privacy-policy": "politica",
  "terms-of-use": "termos",
  "ai-disclosure": "ia",
};

/**
 * Modal de tela cheia, não-fechável, exibido apenas quando o usuário tem
 * consentimentos obrigatórios pendentes (Política e/ou Termos).
 *
 * Estrutura em passos:
 *  1. Política de Privacidade — leitura obrigatória + checkbox.
 *  2. Termos de Uso — leitura obrigatória + checkbox.
 *  3. Inteligência Artificial — opcional (aceitar ou continuar sem IA).
 */
export function ConsentOnboardingModal({
  consents,
  onCompleted,
}: ConsentOnboardingModalProps) {
  const { toast, showToast, hideToast } = useToast();

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];
    const policy = consents.find((c) => c.type === "privacy_policy");
    const terms = consents.find((c) => c.type === "terms_of_use");
    const ai = consents.find((c) => c.type === "ai");
    if (policy && !policy.isAccepted) {
      list.push({
        key: "privacy_policy",
        type: "privacy_policy",
        required: true,
        title: "Política de Privacidade",
        shortTitle: "Privacidade",
        status: policy,
      });
    }
    if (terms && !terms.isAccepted) {
      list.push({
        key: "terms_of_use",
        type: "terms_of_use",
        required: true,
        title: "Termos de Uso",
        shortTitle: "Termos",
        status: terms,
      });
    }
    list.push({
      key: "ai-choice",
      type: "ai",
      required: false,
      title: "Inteligência Artificial",
      shortTitle: "IA",
      status: ai ?? null,
    });
    return list;
  }, [consents]);

  const [stepIndex, setStepIndex] = useState(0);
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [accepted, setAccepted] = useState<Record<ConsentType, boolean>>({
    privacy_policy: false,
    terms_of_use: false,
    ai: false,
  });
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<
    Record<ConsentType, boolean>
  >({
    privacy_policy: false,
    terms_of_use: false,
    ai: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.key === "ai-choice") {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setLoadingDoc(true);
    consentService
      .getDocument(currentStep.type as ConsentType)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((err) => {
        if (!cancelled)
          showToast(
            getApiErrorMessage(err, "Erro ao carregar documento"),
            "error",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, currentStep?.key]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [stepIndex]);

  // Bloqueia tentativas comuns de fechar o modal (ESC e clique fora).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey, true);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey, true);
    };
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || !currentStep?.type) return;
    const reachedBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (reachedBottom) {
      setHasScrolledToBottom((prev) =>
        prev[currentStep.type as ConsentType]
          ? prev
          : { ...prev, [currentStep.type as ConsentType]: true },
      );
    }
  };

  const canAdvance = (() => {
    if (!currentStep) return false;
    if (currentStep.key === "ai-choice") return true;
    const t = currentStep.type as ConsentType;
    return hasScrolledToBottom[t] && accepted[t];
  })();

  const isLast = stepIndex === steps.length - 1;

  const grantPending = async () => {
    setSubmitting(true);
    try {
      // Aceites obrigatórios
      for (const s of steps) {
        if (
          s.type &&
          s.required &&
          accepted[s.type] &&
          s.status &&
          !s.status.isAccepted
        ) {
          await consentService.grant(s.type, s.status.currentVersion);
        }
      }
      // Aceite opcional de IA (somente se usuário marcou)
      const aiStep = steps.find((s) => s.key === "ai-choice");
      if (aiStep?.status && accepted.ai && !aiStep.status.isAccepted) {
        await consentService.grant("ai", aiStep.status.currentVersion);
      }
      await onCompleted();
    } catch (err) {
      showToast(
        getApiErrorMessage(err, "Erro ao registrar consentimentos"),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!canAdvance) return;
    if (isLast) {
      await grantPending();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  if (!currentStep) return null;

  const isAiStep = currentStep.key === "ai-choice";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center bg-gradient-to-br from-black/60 via-black/55 to-primary-950/60 backdrop-blur-sm animate-fade-in"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-onboarding-title"
        className={cn(
          "relative bg-white w-full flex flex-col shadow-2xl",
          "rounded-t-3xl sm:rounded-3xl",
          "h-[92vh] sm:h-[88vh] sm:max-h-[760px]",
          "sm:max-w-2xl lg:max-w-3xl sm:mx-4",
          "animate-slide-up sm:animate-scale-in",
          "overflow-hidden",
        )}
      >
        {/* Drag handle decorativo (mobile) */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-neutral-100 rounded-full" />
        </div>

        {/* Header com gradient sutil */}
        <header className="relative px-5 pt-3 pb-4 sm:px-7 sm:pt-6 sm:pb-5 bg-gradient-to-br from-primary-50/80 via-white to-white border-b border-neutral-100">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur-md" />
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-700/20">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2
                id="consent-onboarding-title"
                className="ds-modal-title font-urbanist tracking-tight"
              >
                Bem-vindo(a) à Inexci
              </h2>
              <p className="ds-caption mt-0.5 sm:mt-1 leading-relaxed">
                Antes de começar, precisamos do seu aceite nos termos abaixo
                para garantir a segurança dos seus dados.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-white border border-neutral-100 text-[11px] font-medium text-neutral-200 shadow-sm">
              <Lock className="w-3 h-3" />
              LGPD
            </span>
          </div>

          {/* Stepper */}
          <Stepper steps={steps} currentIndex={stepIndex} />
        </header>

        {/* Sub-header do passo atual */}
        <div className="flex items-center gap-3 px-5 sm:px-7 py-3 sm:py-3.5 bg-white border-b border-neutral-100">
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
              isAiStep
                ? "bg-violet-50 text-violet-600"
                : "bg-primary-50 text-primary-700",
            )}
          >
            {isAiStep ? (
              <Bot className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-neutral-200 uppercase tracking-wide">
              Passo {stepIndex + 1} de {steps.length}
            </p>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
              {currentStep.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {currentStep.status?.currentVersion && (
              <span className="ds-badge-sm bg-neutral-50 text-neutral-200 border border-neutral-100">
                v{currentStep.status.currentVersion}
              </span>
            )}
            <span
              className={cn(
                "ds-badge-sm border",
                currentStep.required
                  ? "bg-primary-50 text-primary-700 border-primary-100"
                  : "bg-violet-50 text-violet-700 border-violet-100",
              )}
            >
              {currentStep.required ? "Obrigatório" : "Opcional"}
            </span>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="relative flex-1 min-h-0 flex flex-col bg-white">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 py-4 sm:py-5"
          >
            {isAiStep ? (
              <AiChoiceContent
                accepted={accepted.ai}
                onChange={(v) => setAccepted((prev) => ({ ...prev, ai: v }))}
                version={currentStep.status?.currentVersion ?? ""}
              />
            ) : loadingDoc || !doc ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
                <p className="ds-caption">Carregando documento…</p>
              </div>
            ) : (
              <MarkdownContent source={doc.content_md} />
            )}
          </div>

          {/* Fade gradient inferior — ajuda a indicar que há mais conteúdo */}
          {!isAiStep && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-100 bg-white px-5 sm:px-7 py-3 sm:py-4 space-y-3 mobile-sheet-offset">
          {!isAiStep && currentStep.type && (
            <ReadingChecklist
              type={currentStep.type}
              hasScrolled={hasScrolledToBottom[currentStep.type]}
              accepted={accepted[currentStep.type]}
              version={currentStep.status?.currentVersion ?? ""}
              onCheckedChange={(v) =>
                setAccepted((prev) => ({
                  ...prev,
                  [currentStep.type as ConsentType]: v,
                }))
              }
              docSlug={CONSENT_SLUG_BY_TYPE[currentStep.type]}
            />
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0 || submitting}
              className="w-full sm:w-auto"
            >
              Voltar
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              {isAiStep && !accepted.ai && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={async () => {
                    setAccepted((prev) => ({ ...prev, ai: false }));
                    await grantPending();
                  }}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  Continuar sem IA
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canAdvance || submitting}
                isLoading={submitting && isLast}
                size="md"
                className="w-full sm:w-auto"
              >
                {isLast
                  ? accepted.ai
                    ? "Aceitar tudo e continuar"
                    : "Concluir"
                  : "Avançar"}
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

/**
 * Stepper visual: pílulas conectadas com número, ícone de check quando concluídas
 * e label compacto que aparece somente em telas maiores.
 */
function Stepper({
  steps,
  currentIndex,
}: {
  steps: Step[];
  currentIndex: number;
}) {
  return (
    <ol className="mt-4 sm:mt-5 flex items-center gap-1.5 sm:gap-2">
      {steps.map((s, i) => {
        const isCurrent = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <li
            key={s.key}
            className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold shrink-0 transition-all",
                  isComplete
                    ? "bg-primary-700 text-white"
                    : isCurrent
                      ? "bg-white text-primary-700 ring-2 ring-primary-500 ring-offset-2 ring-offset-primary-50/60 shadow-sm"
                      : "bg-white text-neutral-200 border border-neutral-100",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "hidden sm:inline text-xs font-medium truncate",
                  isCurrent
                    ? "text-primary-800"
                    : isComplete
                      ? "text-gray-900"
                      : "text-neutral-200",
                )}
              >
                {s.shortTitle}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "flex-1 h-0.5 rounded-full transition-colors",
                  i < currentIndex ? "bg-primary-700" : "bg-neutral-100",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReadingChecklist({
  type,
  hasScrolled,
  accepted,
  version,
  onCheckedChange,
  docSlug,
}: {
  type: ConsentType;
  hasScrolled: boolean;
  accepted: boolean;
  version: string;
  onCheckedChange: (v: boolean) => void;
  docSlug: string;
}) {
  const docPath = `/privacidade/${STEP_SLUG_PATH[docSlug] ?? "politica"}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <a
          href={docPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline underline-offset-2 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir em nova aba
        </a>
        {!hasScrolled && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-neutral-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Role até o final para habilitar
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => hasScrolled && onCheckedChange(!accepted)}
        disabled={!hasScrolled}
        className={cn(
          "w-full flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border text-left transition-all",
          accepted
            ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200/60"
            : hasScrolled
              ? "bg-white border-neutral-100 hover:border-primary-300 hover:bg-primary-50/30"
              : "bg-neutral-50 border-neutral-100 cursor-not-allowed opacity-80",
        )}
        aria-label={`Confirmar leitura e aceite de ${type} v${version}`}
      >
        <div className="pt-0.5 shrink-0">
          <Checkbox
            checked={accepted}
            disabled={!hasScrolled}
            onCheckedChange={onCheckedChange}
            className={cn(
              accepted && "border-emerald-500 bg-emerald-500",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs md:text-sm font-semibold",
              accepted ? "text-emerald-900" : "text-gray-900",
            )}
          >
            Li e concordo com a versão {version}.
          </p>
          <p
            className={cn(
              "text-[11px] md:text-xs mt-0.5",
              accepted
                ? "text-emerald-700"
                : hasScrolled
                  ? "text-neutral-200"
                  : "text-neutral-200",
            )}
          >
            {accepted
              ? "Aceite registrado nesta etapa."
              : hasScrolled
                ? "Toque para confirmar seu aceite."
                : "Role o documento até o final para habilitar o aceite."}
          </p>
        </div>
        {accepted && (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        )}
      </button>
    </div>
  );
}

function AiChoiceContent({
  accepted,
  onChange,
  version,
}: {
  accepted: boolean;
  onChange: (v: boolean) => void;
  version: string;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Banner explicativo */}
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-violet-50/60 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-md" />
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm md:text-base">
              Assistente de IA via WhatsApp
              <span className="ml-1.5 ds-badge-sm bg-white text-violet-700 border border-violet-200 align-middle">
                Opcional
              </span>
            </p>
            <p className="text-xs md:text-sm text-gray-700 mt-1.5 leading-relaxed">
              A Inexci oferece um assistente baseado em Inteligência Artificial
              para responder dúvidas e auxiliar na gestão das solicitações
              cirúrgicas pelo WhatsApp. Antes de processar mensagens, aplicamos{" "}
              <strong className="font-semibold text-gray-900">
                pseudonimização
              </strong>
              {" "}— substituímos nomes, CPFs, laudos e telefones por códigos
              opacos para que o provedor externo de IA não tenha acesso a dados
              identificáveis.
            </p>
            <p className="text-xs md:text-sm text-gray-700 mt-2 leading-relaxed">
              Você pode usar a plataforma normalmente sem ativar o assistente.
              É possível ativar ou desativar a qualquer momento em{" "}
              <strong className="font-semibold text-gray-900">
                Configurações → Privacidade
              </strong>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Cards de escolha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChoiceCard
          selected={accepted}
          onClick={() => onChange(true)}
          tone="violet"
          title={`Aceitar uso de IA${version ? ` (v. ${version})` : ""}`}
          description="Habilita respostas automáticas no WhatsApp. Você pode revogar a qualquer momento."
        />
        <ChoiceCard
          selected={!accepted}
          onClick={() => onChange(false)}
          tone="neutral"
          title="Continuar sem IA por enquanto"
          description="A plataforma funciona normalmente. Você pode ativar quando quiser."
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  tone,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  tone: "violet" | "neutral";
  title: string;
  description: string;
}) {
  const selectedClasses =
    tone === "violet"
      ? "bg-violet-50 border-violet-300 ring-2 ring-violet-200 shadow-sm"
      : "bg-neutral-50 border-neutral-200 ring-2 ring-neutral-100 shadow-sm";

  const checkClasses =
    tone === "violet"
      ? "bg-violet-600 text-white"
      : "bg-gray-700 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
        selected
          ? selectedClasses
          : "bg-white border-neutral-100 hover:border-gray-300 hover:bg-gray-50",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all mt-0.5",
            selected
              ? checkClasses
              : "bg-white border-2 border-neutral-100",
          )}
        >
          {selected && <Check className="w-3 h-3" strokeWidth={3.5} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
