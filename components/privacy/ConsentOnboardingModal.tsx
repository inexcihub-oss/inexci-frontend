"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
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
import type { ConsentStatus } from "@/types/consent.types";

interface ConsentOnboardingModalProps {
  consents: ConsentStatus;
  onCompleted: () => Promise<void> | void;
}

/**
 * Modal de tela cheia, não-fechável, exibido apenas quando o usuário tem
 * consentimentos obrigatórios pendentes (Política e/ou Termos).
 *
 * Estrutura simples:
 *  - Checkbox para Política de Privacidade (obrigatório).
 *  - Checkbox para Termos de Uso (obrigatório).
 *  - Toggle opcional para ativar o assistente de IA.
 *  - Botão único "Continuar" que persiste tudo.
 */
export function ConsentOnboardingModal({
  consents,
  onCompleted,
}: ConsentOnboardingModalProps) {
  const { toast, showToast, hideToast } = useToast();
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAi, setAcceptedAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const aiAlreadyAccepted = Boolean(consents.aiConsentAcceptedAt);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey, true);
    };
  }, []);

  const canSubmit = acceptedPolicy && acceptedTerms && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await consentService.acceptTerms();
      if (acceptedAi && !aiAlreadyAccepted) {
        await consentService.grantAi();
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
          "max-h-[92vh] sm:max-h-[88vh]",
          "sm:max-w-xl sm:mx-4",
          "animate-slide-up sm:animate-scale-in",
          "overflow-hidden",
        )}
      >
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-neutral-100 rounded-full" />
        </div>

        <header className="relative px-5 pt-3 pb-5 sm:px-7 sm:pt-6 sm:pb-6 bg-white sm:bg-gradient-to-br sm:from-primary-50/80 sm:via-white sm:to-white border-b border-neutral-100">
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
              <p className="ds-caption mt-1 leading-relaxed">
                Antes de começar, leia e aceite os termos abaixo. Eles garantem
                a segurança e a transparência no tratamento dos seus dados.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-white border border-neutral-100 text-[11px] font-medium text-neutral-200 shadow-sm">
              <Lock className="w-3 h-3" />
              LGPD
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 space-y-3">
          <ConsentRow
            icon={FileText}
            title="Política de Privacidade"
            description="Como coletamos, usamos e protegemos seus dados."
            href="/privacidade/politica"
            badge={{ label: "Obrigatório", tone: "primary" }}
            checked={acceptedPolicy}
            onChange={setAcceptedPolicy}
          />

          <ConsentRow
            icon={FileText}
            title="Termos de Uso"
            description="Regras para utilização da plataforma."
            href="/privacidade/termos"
            badge={{ label: "Obrigatório", tone: "primary" }}
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
          />

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-violet-50/60 to-white p-4">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-md" />
                <div className="relative h-9 w-9 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  Assistente de IA via WhatsApp
                  <span className="ds-badge-sm bg-white text-violet-700 border border-violet-200">
                    Opcional
                  </span>
                </p>
                <p className="text-xs text-gray-700 mt-1.5 leading-relaxed">
                  Permite gerenciar suas solicitações cirúrgicas pelo WhatsApp
                  com ajuda da IA. Aplicamos pseudonimização antes de qualquer
                  envio para o provedor externo. Pode ativar ou desativar a
                  qualquer momento.
                </p>
                <a
                  href="/privacidade/ia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-violet-700 hover:text-violet-800 hover:underline underline-offset-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ler aviso completo
                </a>

                <div
                  role="checkbox"
                  aria-checked={acceptedAi || aiAlreadyAccepted}
                  tabIndex={aiAlreadyAccepted ? -1 : 0}
                  onClick={() => !aiAlreadyAccepted && setAcceptedAi((v) => !v)}
                  onKeyDown={(e) => {
                    if (!aiAlreadyAccepted && (e.key === " " || e.key === "Enter")) {
                      e.preventDefault();
                      setAcceptedAi((v) => !v);
                    }
                  }}
                  className={cn(
                    "mt-3 w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all select-none",
                    aiAlreadyAccepted
                      ? "bg-emerald-50 border-emerald-200 cursor-not-allowed"
                      : acceptedAi
                        ? "bg-violet-100 border-violet-300 cursor-pointer"
                        : "bg-white border-neutral-100 hover:border-violet-300 cursor-pointer",
                  )}
                >
                  <Checkbox
                    checked={acceptedAi || aiAlreadyAccepted}
                    disabled={aiAlreadyAccepted}
                    className={cn(
                      "pointer-events-none",
                      (acceptedAi || aiAlreadyAccepted) &&
                        "border-violet-500 bg-violet-500",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">
                      {aiAlreadyAccepted
                        ? "Assistente já ativado anteriormente"
                        : "Quero ativar o assistente de IA"}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {aiAlreadyAccepted
                        ? "Você pode desativar em Configurações → Privacidade."
                        : "Sem isso, a plataforma continua funcionando — só não respondo no WhatsApp."}
                    </p>
                  </div>
                  {(acceptedAi || aiAlreadyAccepted) && (
                    <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-neutral-100 bg-white px-5 sm:px-7 py-2.5 sm:py-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={submitting}
            size="md"
            className="w-full"
          >
            Continuar
          </Button>
          <p className="text-[11px] text-neutral-200 text-center mt-2">
            Ao continuar você confirma a leitura da Política e dos Termos.
          </p>
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

interface ConsentRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  badge: { label: string; tone: "primary" | "violet" };
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ConsentRow({
  icon: Icon,
  title,
  description,
  href,
  badge,
  checked,
  onChange,
}: ConsentRowProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all",
        checked
          ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200/60"
          : "bg-white border-neutral-100",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            "bg-primary-50 text-primary-700",
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span
              className={cn(
                "ds-badge-sm border",
                badge.tone === "primary"
                  ? "bg-primary-50 text-primary-700 border-primary-100"
                  : "bg-violet-50 text-violet-700 border-violet-100",
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline underline-offset-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ler documento completo
          </a>
        </div>
      </div>

      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={cn(
          "mt-3 w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer select-none",
          checked
            ? "bg-white border-emerald-200"
            : "bg-neutral-50 border-neutral-100 hover:border-primary-300",
        )}
      >
        <Checkbox
          checked={checked}
          className={cn("pointer-events-none", checked && "border-emerald-500 bg-emerald-500")}
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-semibold",
              checked ? "text-emerald-900" : "text-gray-900",
            )}
          >
            Li e concordo com a {title}.
          </p>
        </div>
        {checked && (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        )}
      </div>
    </div>
  );
}
