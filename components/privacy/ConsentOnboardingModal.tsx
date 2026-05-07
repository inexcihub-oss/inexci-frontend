"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Shield,
} from "lucide-react";
import Button from "@/components/ui/Button";
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
  status: ConsentStatus | null;
}

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
        status: policy,
      });
    }
    if (terms && !terms.isAccepted) {
      list.push({
        key: "terms_of_use",
        type: "terms_of_use",
        required: true,
        title: "Termos de Uso",
        status: terms,
      });
    }
    list.push({
      key: "ai-choice",
      type: "ai",
      required: false,
      title: "Inteligência Artificial",
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

  const Icon = currentStep.key === "ai-choice" ? Bot : FileText;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-onboarding-title"
        className="bg-white w-full sm:max-w-3xl sm:mx-4 h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl"
      >
        <header className="px-5 py-4 md:p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-50">
            <Shield className="w-5 h-5 text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="consent-onboarding-title"
              className="text-base md:text-lg font-semibold text-gray-900"
            >
              Bem-vindo(a) à Inexci
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              Antes de continuar, precisamos do seu aceite nos termos abaixo.
            </p>
          </div>
        </header>

        <nav className="px-5 md:px-6 pt-4 flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                i < stepIndex
                  ? "bg-primary-700"
                  : i === stepIndex
                    ? "bg-primary-400"
                    : "bg-gray-200",
              )}
            />
          ))}
        </nav>

        <div className="px-5 md:px-6 pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-50">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900">
              Passo {stepIndex + 1} de {steps.length} — {currentStep.title}
            </h3>
            {currentStep.status?.currentVersion && (
              <p className="text-xs text-gray-500">
                Versão {currentStep.status.currentVersion}
                {currentStep.required ? " · Obrigatório" : " · Opcional"}
              </p>
            )}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 md:px-6 py-4"
        >
          {currentStep.key === "ai-choice" ? (
            <AiChoiceContent
              accepted={accepted.ai}
              onChange={(v) => setAccepted((prev) => ({ ...prev, ai: v }))}
              version={currentStep.status?.currentVersion ?? ""}
            />
          ) : loadingDoc || !doc ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <MarkdownContent source={doc.content_md} />
          )}
        </div>

        <footer className="border-t border-gray-100 px-5 md:px-6 py-4 space-y-3 bg-white">
          {currentStep.key !== "ai-choice" && currentStep.type && (
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
              size="sm"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0 || submitting}
            >
              Voltar
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              {currentStep.key === "ai-choice" && !accepted.ai && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    setAccepted((prev) => ({ ...prev, ai: false }));
                    await grantPending();
                  }}
                  disabled={submitting}
                >
                  Continuar sem IA
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canAdvance || submitting}
                isLoading={submitting && isLast}
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
  return (
    <div className="space-y-2">
      <a
        href={`/privacidade/${docSlug === "privacy-policy" ? "politica" : docSlug === "terms-of-use" ? "termos" : "ia"}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary-700 hover:underline"
      >
        <ExternalLink className="w-3 h-3" /> Abrir em nova aba
      </a>
      <label
        className={cn(
          "flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
          accepted
            ? "bg-emerald-50 border-emerald-200"
            : hasScrolled
              ? "bg-white border-gray-300"
              : "bg-gray-50 border-gray-200 cursor-not-allowed",
        )}
      >
        <input
          type="checkbox"
          checked={accepted}
          disabled={!hasScrolled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
          aria-label={`Confirmar leitura e aceite de ${type} v${version}`}
        />
        <div className="flex-1 text-xs md:text-sm">
          <p
            className={cn(
              "font-medium",
              accepted ? "text-emerald-900" : "text-gray-900",
            )}
          >
            Li e concordo com a versão {version}.
          </p>
          {!hasScrolled && (
            <p className="text-gray-500 mt-0.5">
              Role o documento até o final para habilitar o aceite.
            </p>
          )}
        </div>
        {accepted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
      </label>
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-violet-600 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 text-sm md:text-base">
              Assistente de IA via WhatsApp (opcional)
            </p>
            <p className="text-xs md:text-sm text-gray-700 mt-1">
              A Inexci oferece um assistente baseado em Inteligência Artificial
              para responder dúvidas e auxiliar na gestão das solicitações
              cirúrgicas pelo WhatsApp. Antes de processar mensagens, aplicamos
              <strong> pseudonimização</strong> — substituímos nomes, CPFs,
              laudos e telefones por códigos opacos para que o provedor externo
              de IA não tenha acesso a dados identificáveis.
            </p>
            <p className="text-xs md:text-sm text-gray-700 mt-2">
              Você pode usar a plataforma normalmente sem ativar o assistente.
              É possível ativar ou desativar a qualquer momento em
              <strong> Configurações → Privacidade</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            accepted
              ? "bg-violet-50 border-violet-300 ring-2 ring-violet-200"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <p className="font-semibold text-sm text-gray-900">
            Aceitar uso de IA (v. {version})
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Habilita respostas automáticas no WhatsApp. Você pode revogar a
            qualquer momento.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            !accepted
              ? "bg-gray-50 border-gray-300 ring-2 ring-gray-200"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <p className="font-semibold text-sm text-gray-900">
            Continuar sem IA por enquanto
          </p>
          <p className="text-xs text-gray-600 mt-1">
            A plataforma funciona normalmente. Você pode ativar quando quiser.
          </p>
        </button>
      </div>
    </div>
  );
}
