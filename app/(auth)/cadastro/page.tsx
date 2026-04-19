"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { authService } from "@/services/auth.service";
import { SubscriptionPlan } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
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

// ─── Constantes ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Dados pessoais", "Seu perfil", "Plano"];

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Criar sua conta", subtitle: "Preencha seus dados para começar" },
  2: { title: "Seu perfil", subtitle: "Como você usa o INEXCI?" },
  3: {
    title: "Escolha seu plano",
    subtitle: "Você pode mudar de plano a qualquer momento",
  },
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
  3: {
    badge: "Etapa 3 de 3 — Seu plano",
    heading: "Escolha o plano ideal",
    description:
      "Todos os planos incluem acesso completo às funcionalidades da plataforma.",
  },
};

const STEP_BENEFITS: Record<number, { icon: string; text: string }[]> = {
  1: [
    { icon: "\u{1F512}", text: "Dados protegidos com criptografia" },
    { icon: "\u26A1", text: "Configuração em minutos" },
    { icon: "\u{1F193}", text: "Sem cartão de crédito para começar" },
  ],
  2: [
    { icon: "\u{1FA7A}", text: "Médicos criam solicitações cirúrgicas" },
    { icon: "\u{1F465}", text: "Gestores adicionam médicos à equipe" },
    { icon: "\u{1F4CB}", text: "Kanban inteligente para todos os perfis" },
  ],
  3: [
    { icon: "\u2705", text: "Plano Básico gratuito para começar" },
    { icon: "\u{1F4C8}", text: "Escale quando sua equipe crescer" },
    { icon: "\u{1F504}", text: "Mude de plano a qualquer momento" },
  ],
};

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CadastroPage() {
  const { register } = useAuth();

  // Controle de etapas
  const [currentStep, setCurrentStep] = useState(1);

  // Etapa 1 — Dados pessoais
  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Etapa 2 — Perfil
  const [step2, setStep2] = useState<Step2Data>({
    isDoctor: false,
    crm: "",
    crmState: "",
    specialty: "",
  });

  // Etapa 3 — Plano
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [plansLoading, setPlansLoading] = useState(false);

  // Erros de campo (etapa 2)
  const [step2FieldErrors, setStep2FieldErrors] = useState<
    Partial<Record<keyof Step2Data, string>>
  >({});

  // Submissão
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<
    "" | "email_active" | "email_pending" | "generic"
  >("");
  const [isLoading, setIsLoading] = useState(false);

  // Carrega planos ao chegar na etapa 3
  useEffect(() => {
    if (currentStep === 3 && plans.length === 0) {
      setPlansLoading(true);
      authService
        .getPlans()
        .then((data) => {
          setPlans(data);
          if (data.length > 0) {
            const basic = data.find((p) => p.name === "Básico") || data[0];
            setSelectedPlanId(basic.id);
          }
        })
        .catch(() => {
          // fallback silencioso — o backend usa Básico por padrão
        })
        .finally(() => setPlansLoading(false));
    }
  }, [currentStep, plans.length]);

  // ── Handlers de estado ─────────────────────────────────────────────────────

  const handleStep1Change = (field: keyof Step1Data, value: string) => {
    setStep1((prev) => ({ ...prev, [field]: value }));
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

  // ── Validações por etapa ───────────────────────────────────────────────────

  const validateStep1 = (): string | null => {
    const result = step1Schema.safeParse(step1);
    if (!result.success) return result.error.issues[0].message;
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

  // ── Navegação ──────────────────────────────────────────────────────────────

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
    setStep2FieldErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ── Submit final ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("");
    setIsLoading(true);

    try {
      await register({
        name: step1.name,
        email: step1.email,
        password: step1.password,
        is_doctor: step2.isDoctor,
        ...(step2.isDoctor && {
          crm: step2.crm,
          crm_state: step2.crmState,
          specialty: step2.specialty || undefined,
        }),
        subscription_plan_id: selectedPlanId || undefined,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const { title, subtitle } = STEP_TITLES[currentStep];
  const hero = STEP_HERO[currentStep];
  const benefits = STEP_BENEFITS[currentStep];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Lado esquerdo — formulário ─────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-5 sm:px-8 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/brand/logo.png"
              alt="Inexci"
              width={140}
              height={42}
              className="h-10 w-auto"
            />
          </div>

          {/* Título dinâmico */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 font-urbanist">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>

          {/* Indicador de progresso */}
          <StepIndicator
            current={currentStep}
            total={TOTAL_STEPS}
            labels={STEP_LABELS}
          />

          {/* ── Conteúdo da etapa ─────────────────────────────────────────── */}
          {currentStep === 1 && (
            <Step1PersonalData data={step1} onChange={handleStep1Change} />
          )}

          {currentStep === 2 && (
            <Step2Profile
              data={step2}
              onChange={handleStep2Change}
              fieldErrors={step2FieldErrors}
            />
          )}

          {currentStep === 3 && (
            <Step3Plan
              plans={plans}
              plansLoading={plansLoading}
              selectedPlanId={selectedPlanId}
              onSelectPlan={setSelectedPlanId}
              error={error}
              errorType={errorType}
              isLoading={isLoading}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          )}

          {/* ── Erro das etapas 1 e 2 ────────────────────────────────────── */}
          {error && currentStep < 3 && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Botões de navegação (etapas 1 e 2) ───────────────────────── */}
          {currentStep < 3 && (
            <div className="mt-6 flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  onClick={handleBack}
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
          )}

          {/* ── Link para login ───────────────────────────────────────────── */}
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

      {/* ── Lado direito — decorativo ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex-col">
        {/* Orbs de fundo */}
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

            {/* Benefícios por etapa */}
            <div className="space-y-3 text-left">
              {benefits.map((b) => (
                <Benefit key={b.text} icon={b.icon} text={b.text} />
              ))}
            </div>
          </div>
        </div>

        {/* Linha decorativa inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-purple-500 to-blue-500" />
      </div>
    </div>
  );
}
