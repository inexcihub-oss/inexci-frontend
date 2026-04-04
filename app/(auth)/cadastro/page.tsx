"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authService } from "@/services/auth.service";
import { SubscriptionPlan } from "@/types";

// ─── Constantes ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const brazilianStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const PLAN_META: Record<
  string,
  { icon: string; color: string; highlight: boolean; features: string[] }
> = {
  Básico: {
    icon: "🌱",
    color: "teal",
    highlight: false,
    features: [
      "1 médico cadastrado",
      "Solicitações ilimitadas",
      "Suporte por e-mail",
    ],
  },
  Profissional: {
    icon: "🚀",
    color: "purple",
    highlight: true,
    features: [
      "Até 10 médicos cadastrados",
      "Solicitações ilimitadas",
      "Suporte prioritário",
    ],
  },
  Enterprise: {
    icon: "🏢",
    color: "indigo",
    highlight: false,
    features: [
      "Médicos ilimitados",
      "Solicitações ilimitadas",
      "Suporte dedicado 24/7",
    ],
  },
};

// ─── Componente de Indicador de Progresso ────────────────────────────────────

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Linha de fundo */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
        {/* Linha de progresso */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-teal-500 transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />

        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const isDone = step < current;
          const isCurrent = step === current;

          return (
            <div
              key={step}
              className="flex flex-col items-center relative z-10"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${isDone ? "bg-teal-500 text-white" : isCurrent ? "bg-teal-500 text-white ring-4 ring-teal-100" : "bg-white border-2 border-gray-300 text-gray-400"}`}
              >
                {isDone ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center max-w-[80px] leading-tight
                  ${isCurrent ? "text-teal-600" : isDone ? "text-teal-500" : "text-gray-400"}`}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CadastroPage() {
  const router = useRouter();

  // Controle de etapas
  const [currentStep, setCurrentStep] = useState(1);

  // Etapa 1 — Dados pessoais
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Etapa 2 — Perfil
  const [isDoctor, setIsDoctor] = useState(false);
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Etapa 3 — Plano
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [plansLoading, setPlansLoading] = useState(false);

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

  // ── Validações por etapa ───────────────────────────────────────────────────

  const validateStep1 = (): string | null => {
    if (name.trim().length < 3)
      return "O nome deve ter pelo menos 3 caracteres.";
    if (!email.includes("@")) return "Informe um e-mail válido.";
    if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (password !== confirmPassword) return "As senhas não coincidem.";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (isDoctor && !crm.trim()) return "CRM é obrigatório para médicos.";
    if (isDoctor && !crmState)
      return "Estado do CRM é obrigatório para médicos.";
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
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ── Submit final ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("");
    setIsLoading(true);

    try {
      await authService.register({
        name,
        email,
        password,
        is_doctor: isDoctor,
        ...(isDoctor && {
          crm,
          crm_state: crmState,
          specialty: specialty || undefined,
        }),
        subscription_plan_id: selectedPlanId || undefined,
      });

      router.push("/login?registered=true");
    } catch (err: any) {
      const message: string =
        err.response?.data?.message || "Erro ao criar conta. Tente novamente.";
      setError(message);
      if (message.includes("convite pendente")) setErrorType("email_pending");
      else if (message.includes("já está cadastrado"))
        setErrorType("email_active");
      else setErrorType("generic");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Força de senha ─────────────────────────────────────────────────────────

  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Fraca", "Razoável", "Boa", "Forte"][
    passwordStrength
  ];
  const strengthColor = [
    "",
    "bg-red-500",
    "bg-yellow-400",
    "bg-blue-500",
    "bg-teal-500",
  ][passwordStrength];

  // ── Utilitários de plano ───────────────────────────────────────────────────

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const getPlanMeta = (name: string) =>
    PLAN_META[name] ?? {
      icon: "📋",
      color: "gray",
      highlight: false,
      features: [],
    };

  // ── Render ─────────────────────────────────────────────────────────────────

  const stepLabels = ["Dados pessoais", "Seu perfil", "Plano"];

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
            {currentStep === 1 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900 font-urbanist">
                  Criar sua conta
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Preencha seus dados para começar
                </p>
              </>
            )}
            {currentStep === 2 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900 font-urbanist">
                  Seu perfil
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Como você usa o INEXCI?
                </p>
              </>
            )}
            {currentStep === 3 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900 font-urbanist">
                  Escolha seu plano
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Você pode mudar de plano a qualquer momento
                </p>
              </>
            )}
          </div>

          {/* Indicador de progresso */}
          <StepIndicator
            current={currentStep}
            total={TOTAL_STEPS}
            labels={stepLabels}
          />

          {/* ── ETAPA 1: Dados pessoais ──────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[48px] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[48px] transition-colors"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[48px] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Barra de força da senha */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= level
                              ? strengthColor
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Força da senha:{" "}
                      <span className="font-medium">{strengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[48px] transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-300 bg-red-50"
                        : confirmPassword && confirmPassword === password
                          ? "border-teal-300"
                          : "border-gray-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-red-500">
                    As senhas não coincidem
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── ETAPA 2: Perfil ──────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Informe como você atua para personalizarmos sua experiência.
              </p>

              {/* Cards de perfil */}
              <div className="grid grid-cols-2 gap-3">
                {/* Médico */}
                <button
                  type="button"
                  onClick={() => setIsDoctor(true)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
                    isDoctor
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isDoctor ? "bg-teal-100" : "bg-gray-100"}`}
                  >
                    🩺
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-semibold ${isDoctor ? "text-teal-700" : "text-gray-700"}`}
                    >
                      Médico(a)
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Cria solicitações
                    </p>
                  </div>
                  {isDoctor && (
                    <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Não-médico */}
                <button
                  type="button"
                  onClick={() => setIsDoctor(false)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
                    !isDoctor
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${!isDoctor ? "bg-teal-100" : "bg-gray-100"}`}
                  >
                    🏥
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-semibold ${!isDoctor ? "text-teal-700" : "text-gray-700"}`}
                    >
                      Gestor / Clínica
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Gerencia a equipe
                    </p>
                  </div>
                  {!isDoctor && (
                    <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Campos do médico (condicional) */}
              {isDoctor && (
                <div className="space-y-3 p-4 bg-teal-50 rounded-2xl border border-teal-100 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                    Dados do CRM
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        CRM *
                      </label>
                      <input
                        type="text"
                        value={crm}
                        onChange={(e) => setCrm(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[42px] transition-colors bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        UF *
                      </label>
                      <select
                        value={crmState}
                        onChange={(e) => setCrmState(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[42px] transition-colors bg-white"
                      >
                        <option value="">UF</option>
                        {brazilianStates.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Especialidade{" "}
                      <span className="text-gray-400">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Ex: Ortopedia, Cardiologia..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[42px] transition-colors bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ETAPA 3: Plano ───────────────────────────────────────────── */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit}>
              {plansLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Carregando planos...</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                  Não foi possível carregar os planos. Sua conta será criada no
                  plano Básico.
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const meta = getPlanMeta(plan.name);
                    const isSelected = plan.id === selectedPlanId;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
                          isSelected
                            ? "border-teal-500 bg-teal-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        } ${meta.highlight ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
                      >
                        {meta.highlight && (
                          <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl">
                            POPULAR
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="text-2xl mt-0.5">{meta.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-semibold text-base ${isSelected ? "text-teal-700" : "text-gray-800"}`}
                              >
                                {plan.name}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-2">
                              {plan.description}
                            </p>
                            <ul className="space-y-1">
                              {meta.features.map((f) => (
                                <li
                                  key={f}
                                  className="flex items-center gap-1.5 text-xs text-gray-600"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-teal-500 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-teal-500 bg-teal-500"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
                  <p>{error}</p>
                  {errorType === "email_active" && (
                    <div className="mt-2 flex gap-3">
                      <Link
                        href="/login"
                        className="font-semibold underline hover:text-red-900"
                      >
                        Fazer login
                      </Link>
                      <span className="text-red-400">·</span>
                      <Link
                        href="/login?tab=recovery"
                        className="font-semibold underline hover:text-red-900"
                      >
                        Recuperar senha
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Botões da etapa 3 */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50 transition-all min-h-[48px]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[48px] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Criando conta...
                    </span>
                  ) : (
                    "Criar conta"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── Erro das etapas 1 e 2 ────────────────────────────────────── */}
          {error && currentStep < 3 && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Botões de navegação (etapas 1 e 2) ───────────────────────── */}
          {currentStep < 3 && (
            <div className={`mt-6 flex gap-3`}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all min-h-[48px]"
                >
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 min-h-[48px] active:scale-[0.98]"
              >
                Continuar
              </button>
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
                {currentStep === 1 && "Etapa 1 de 3 — Seus dados"}
                {currentStep === 2 && "Etapa 2 de 3 — Seu perfil"}
                {currentStep === 3 && "Etapa 3 de 3 — Seu plano"}
              </span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight">
              {currentStep === 1 && "Comece em menos de 2 minutos"}
              {currentStep === 2 && "Personalizamos para você"}
              {currentStep === 3 && "Escolha o plano ideal"}
            </h2>

            <p className="text-gray-300 text-lg">
              {currentStep === 1 &&
                "Crie sua conta com segurança e comece a transformar sua gestão cirúrgica."}
              {currentStep === 2 &&
                "Médico ou gestor — a INEXCI adapta o fluxo de trabalho ao seu perfil."}
              {currentStep === 3 &&
                "Todos os planos incluem acesso completo às funcionalidades da plataforma."}
            </p>

            {/* Benefícios resumidos por etapa */}
            <div className="space-y-3 text-left">
              {currentStep === 1 && (
                <>
                  <Benefit icon="🔒" text="Dados protegidos com criptografia" />
                  <Benefit icon="⚡" text="Configuração em minutos" />
                  <Benefit
                    icon="🆓"
                    text="Sem cartão de crédito para começar"
                  />
                </>
              )}
              {currentStep === 2 && (
                <>
                  <Benefit
                    icon="🩺"
                    text="Médicos criam solicitações cirúrgicas"
                  />
                  <Benefit
                    icon="👥"
                    text="Gestores adicionam médicos à equipe"
                  />
                  <Benefit
                    icon="📋"
                    text="Kanban inteligente para todos os perfis"
                  />
                </>
              )}
              {currentStep === 3 && (
                <>
                  <Benefit
                    icon="✅"
                    text="Plano Básico gratuito para começar"
                  />
                  <Benefit icon="📈" text="Escale quando sua equipe crescer" />
                  <Benefit icon="🔄" text="Mude de plano a qualquer momento" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Linha decorativa inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-purple-500 to-blue-500" />
      </div>
    </div>
  );
}

// ─── Componente auxiliar ──────────────────────────────────────────────────────

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-white/80">{text}</span>
    </div>
  );
}
