"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { billingService } from "@/services/billing.service";
import {
  StepIndicator,
  Step1PersonalData,
  Step2Profile,
  Step3Plan,
  Benefit,
  type Step1Data,
  type Step2Data,
} from "@/components/cadastro/CadastroSteps";
import { Button } from "@/components/ui";
import { step1Schema, step2Schema } from "@/lib/schemas/cadastro.schema";
import { unmask } from "@/lib/masks";
import type { SubscriptionPlan } from "@/types";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Dados pessoais", "Seu perfil", "Plano"];

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Criar sua conta",
    subtitle: "Preencha seus dados para começar",
  },
  2: { title: "Seu perfil", subtitle: "Como você usa o INEXCI?" },
};

const STEP_HERO: Record<
  number,
  { badge: string; heading: string; description: string }
> = {
  1: {
    badge: "Etapa 1 de 3 — Seus dados",
    heading: "Comece em menos de 2 minutos",
    description:
      "Crie sua conta com segurança e comece a transformar sua gestão cirúrgica.",
  },
  2: {
    badge: "Etapa 2 de 3 — Seu perfil",
    heading: "Personalizamos para você",
    description:
      "Médico ou gestor — a INEXCI adapta o fluxo de trabalho ao seu perfil.",
  },
};

const STEP_BENEFITS: Record<number, { icon: string; text: string }[]> = {
  1: [
    { icon: "🔒", text: "Dados protegidos com criptografia" },
    { icon: "⚡", text: "Configuração em minutos" },
    { icon: "🆓", text: "Starter com 30 dias grátis sem cartão" },
  ],
  2: [
    { icon: "🩺", text: "Médicos criam solicitações cirúrgicas" },
    { icon: "👥", text: "Gestores adicionam médicos à equipe" },
    { icon: "📋", text: "Kanban inteligente para todos os perfis" },
  ],
};

const DEFAULT_PLAN_SLUG = "starter";

export default function CadastroPage() {
  const { register } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [step2, setStep2] = useState<Step2Data>({
    isDoctor: false,
    crm: "",
    crmState: "",
    specialty: "",
  });

  const [step1FieldErrors, setStep1FieldErrors] = useState<
    Partial<Record<keyof Step1Data, string>>
  >({});

  const [step2FieldErrors, setStep2FieldErrors] = useState<
    Partial<Record<keyof Step2Data, string>>
  >({});

  // ─── Etapa 3 — planos ────────────────────────────────────────────────────
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>(DEFAULT_PLAN_SLUG);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<
    "" | "email_active" | "email_pending" | "generic"
  >("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedIsTrialPlan =
    plans.find((p) => p.slug === selectedSlug)?.isTrialDefault ?? true;

  const handleBillingPeriodChange = (period: "MONTHLY" | "YEARLY") => {
    setBillingPeriod(period);
    // Mapeia o slug selecionado para o equivalente no outro período
    // Convenção: slug anual = slug mensal + "-anual"
    if (period === "YEARLY") {
      const annualSlug = selectedSlug.endsWith("-anual")
        ? selectedSlug
        : `${selectedSlug}-anual`;
      const exists = plans.some((p) => p.slug === annualSlug);
      if (exists) setSelectedSlug(annualSlug);
    } else {
      const monthlySlug = selectedSlug.endsWith("-anual")
        ? selectedSlug.slice(0, -6)
        : selectedSlug;
      const exists = plans.some((p) => p.slug === monthlySlug);
      if (exists) setSelectedSlug(monthlySlug);
    }
  };

  // Carrega planos quando entrar na etapa 3
  useEffect(() => {
    if (currentStep !== 3 || plans.length > 0) return;
    setPlansLoading(true);
    billingService
      .listPlans()
      .then((data) => {
        setPlans(data);
        const hasDefault = data.some((p) => p.slug === DEFAULT_PLAN_SLUG);
        if (!hasDefault && data.length > 0) {
          setSelectedSlug(data[0].slug);
        }
      })
      .catch(() => {
        // Silencioso — sem planos, o backend usa o plano default (starter)
      })
      .finally(() => setPlansLoading(false));
  }, [currentStep, plans.length]);





  const handleStep1Change = (field: keyof Step1Data, value: string) => {
    setStep1((prev) => ({ ...prev, [field]: value }));
    if (step1FieldErrors[field]) {
      setStep1FieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStep2Change = (
    field: keyof Step2Data,
    value: string | boolean,
  ) => {
    setStep2((prev) => ({ ...prev, [field]: value }));
    if (step2FieldErrors[field]) {
      setStep2FieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = (): string | null => {
    const result = step1Schema.safeParse(step1);
    if (!result.success) {
      const fieldErrs: Partial<Record<keyof Step1Data, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Step1Data;
        if (field && !fieldErrs[field]) fieldErrs[field] = issue.message;
      }
      setStep1FieldErrors(fieldErrs);
      return result.error.issues[0].message;
    }
    setStep1FieldErrors({});
    return null;
  };

  const validateStep2 = (): string | null => {
    const result = step2Schema.safeParse(step2);
    if (!result.success) {
      const fieldErrs: Partial<Record<keyof Step2Data, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Step2Data;
        if (field && !fieldErrs[field]) fieldErrs[field] = issue.message;
      }
      setStep2FieldErrors(fieldErrs);
      return result.error.issues[0].message;
    }
    setStep2FieldErrors({});
    return null;
  };

  const handleNext = () => {
    setError("");
    setErrorType("");

    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setError("");
    setErrorType("");
    setStep1FieldErrors({});
    setStep2FieldErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setError("");
    setErrorType("");
    setIsLoading(true);
    try {
      const phoneDigits = unmask(step1.phone);
      await register({
        name: step1.name,
        email: step1.email,
        phone: phoneDigits || undefined,
        password: step1.password,
        isDoctor: step2.isDoctor,
        ...(step2.isDoctor && {
          crm: step2.crm,
          crmState: step2.crmState,
          specialty: step2.specialty || undefined,
        }),
        planSlug: selectedSlug || undefined,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message =
        axiosErr.response?.data?.message ||
        "Erro ao criar conta. Tente novamente.";
      setError(message);
      if (message.includes("convite pendente")) setErrorType("email_pending");
      else if (message.includes("já está cadastrado"))
        setErrorType("email_active");
      else setErrorType("generic");
    } finally {
      setIsLoading(false);
    }
  };

  // A etapa 3 usa um layout dedicado em tela cheia (sem painel direito)
  if (currentStep === 3) {
    return (
      <PlanStepLayout
        plans={plans}
        plansLoading={plansLoading}
        selectedSlug={selectedSlug}
        onSelectPlan={setSelectedSlug}
        billingPeriod={billingPeriod}
        onBillingPeriodChange={handleBillingPeriodChange}
        selectedIsTrialPlan={selectedIsTrialPlan}

        onBack={handleBack}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        errorType={errorType}
      />
    );
  }

  const { title, subtitle } = STEP_TITLES[currentStep];
  const hero = STEP_HERO[currentStep];
  const benefits = STEP_BENEFITS[currentStep];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex items-start justify-center px-5 sm:px-8 py-10 overflow-y-auto min-h-0">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Image
              src="/brand/logo.png"
              alt="Inexci"
              width={140}
              height={42}
              className="h-10 w-auto"
            />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 font-urbanist">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>

          <StepIndicator
            current={currentStep}
            total={TOTAL_STEPS}
            labels={STEP_LABELS}
          />

          {currentStep === 1 && (
            <Step1PersonalData
              data={step1}
              onChange={handleStep1Change}
              fieldErrors={step1FieldErrors}
            />
          )}

          {currentStep === 2 && (
            <Step2Profile
              data={step2}
              onChange={handleStep2Change}
              fieldErrors={step2FieldErrors}
            />
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              <p>{error}</p>
              {errorType === "email_active" && (
                <div className="mt-2 flex gap-3">
                  <a
                    href="/login"
                    className="font-semibold underline hover:text-red-900"
                  >
                    Fazer login
                  </a>
                  <span className="text-red-400">·</span>
                  <a
                    href="/login?tab=recovery"
                    className="font-semibold underline hover:text-red-900"
                  >
                    Recuperar senha
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                variant="outline"
                className="flex-1 text-sm font-semibold min-h-[48px]"
              >
                Voltar
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 text-sm font-semibold min-h-[48px]"
            >
              Continuar
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-teal-500 hover:text-teal-600"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex-col">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
          <div
            className="absolute bottom-32 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-12">
          <div className="max-w-sm space-y-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/90 font-medium">
                {hero.badge}
              </span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight">
              {hero.heading}
            </h2>

            <p className="text-gray-300 text-lg">{hero.description}</p>

            <div className="space-y-3 text-left">
              {benefits.map((b) => (
                <Benefit key={b.text} icon={b.icon} text={b.text} />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-purple-500 to-blue-500" />
      </div>
    </div>
  );
}

// ─── Layout dedicado da etapa 3 (full width, sem painel direito) ────────────

interface PlanStepLayoutProps {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  selectedSlug: string;
  onSelectPlan: (slug: string) => void;
  billingPeriod: "MONTHLY" | "YEARLY";
  onBillingPeriodChange: (p: "MONTHLY" | "YEARLY") => void;
  selectedIsTrialPlan: boolean;

  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string;
  errorType: "" | "email_active" | "email_pending" | "generic";
}

function PlanStepLayout({
  plans,
  plansLoading,
  selectedSlug,
  onSelectPlan,
  billingPeriod,
  onBillingPeriodChange,
  selectedIsTrialPlan,

  onBack,
  onSubmit,
  isLoading,
  error,
  errorType,
}: PlanStepLayoutProps) {
  const selectedPlan = plans.find((p) => p.slug === selectedSlug);
  const ctaLabel = selectedIsTrialPlan
    ? "Começar 30 dias grátis"
    : "Assinar agora";

  return (
    /*
     * Layout: o wrapper é o próprio container de scroll (h-screen + overflow-y-auto).
     */
    <div className="flex flex-col h-screen overflow-y-auto bg-gray-50">
      {/* Decorações de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-40 -right-32 w-[360px] sm:w-[520px] h-[360px] sm:h-[520px] bg-purple-200 rounded-full filter blur-3xl opacity-40" />
        <div className="absolute top-1/3 -left-40 w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] bg-teal-200 rounded-full filter blur-3xl opacity-30" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] bg-blue-200 rounded-full filter blur-3xl opacity-30" />
      </div>

      {/* Área de conteúdo */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-8 pb-6 sm:pb-8">
        {/* Topbar */}
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <Image
            src="/brand/logo.png"
            alt="Inexci"
            width={130}
            height={40}
            className="h-8 sm:h-9 w-auto"
          />
          <Link
            href="/login"
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors text-right"
          >
            <span className="hidden sm:inline">Já tem conta? </span>
            <span className="font-semibold text-teal-600">Fazer login</span>
          </Link>
        </div>

        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-[11px] text-gray-700 font-semibold">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            Etapa 3 de 3 — Seu plano
          </span>
          <h1 className="mt-3 text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight font-urbanist">
            {selectedIsTrialPlan
              ? "Starter grátis por 30 dias. Sem cartão."
              : "Escolha o plano ideal para você."}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 px-2">
            {selectedIsTrialPlan
              ? "Comece no Starter sem cartão. Faça upgrade quando quiser, sem multa."
              : "Planos pagos iniciam a cobrança imediatamente. Cancele quando quiser."}
          </p>
        </div>

        {/* Indicador de progresso */}
        <div className="hidden sm:block max-w-md mx-auto mb-6 lg:mb-7">
          <PlanStepProgress current={3} total={TOTAL_STEPS} />
        </div>

        {/* Cards de plano + formulário de cartão */}
        <Step3Plan
          plans={plans}
          plansLoading={plansLoading}
          selectedSlug={selectedSlug}
          onSelectPlan={onSelectPlan}
          billingPeriod={billingPeriod}
          onBillingPeriodChange={onBillingPeriodChange}

        />

        {/* Erro */}
        {error && (
          <div className="mt-5 max-w-2xl mx-auto rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <p>{error}</p>
            {errorType === "email_active" && (
              <div className="mt-2 flex gap-3">
                <a
                  href="/login"
                  className="font-semibold underline hover:text-red-900"
                >
                  Fazer login
                </a>
                <span className="text-red-400">·</span>
                <a
                  href="/login?tab=recovery"
                  className="font-semibold underline hover:text-red-900"
                >
                  Recuperar senha
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full bg-gray-50/90 backdrop-blur-sm border-t border-gray-200/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-teal-50 items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              Plano selecionado:{" "}
              <span className="text-teal-600">{selectedPlan?.name ?? "—"}</span>
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {selectedIsTrialPlan
                ? "Trial de 30 dias gratuito · Sem cartão agora"
                : "Cobrança imediata · Cancele quando quiser"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !selectedSlug}
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="truncate">Criando conta...</span>
                </>
              ) : (
                <>
                  <span className="truncate">{ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-2.5 flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            🔒 <span className="hidden xs:inline">Pagamento seguro</span>
            <span className="xs:hidden">Seguro</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="inline-flex items-center gap-1">
            🔄 <span className="hidden xs:inline">Cancele quando quiser</span>
            <span className="xs:hidden">Cancele</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="inline-flex items-center gap-1">
            🎁{" "}
            <span>
              {selectedIsTrialPlan ? "30 dias grátis" : "Stripe PCI-DSS"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Indicador de progresso fino para o cabeçalho da etapa 3. */
function PlanStepProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step <= current;
        return (
          <div
            key={step}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              isActive
                ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                : "bg-gray-200"
            }`}
          />
        );
      })}
    </div>
  );
}
