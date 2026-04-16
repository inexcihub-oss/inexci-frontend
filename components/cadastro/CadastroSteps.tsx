"use client";

import { SubscriptionPlan } from "@/types";
import { Button, Input, Select } from "@/components/ui";
import { PasswordInput } from "@/components/ui";

// ─── Constantes ──────────────────────────────────────────────────────────────

export const brazilianStates = [
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

export const PLAN_META: Record<
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

// ─── Indicador de Progresso ──────────────────────────────────────────────────

export function StepIndicator({
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
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
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

// ─── Benefício decorativo (painel direito) ──────────────────────────────────

export function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-white/80">{text}</span>
    </div>
  );
}

// ─── Etapa 1 — Dados pessoais ────────────────────────────────────────────────

export interface Step1Data {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Step1Props {
  data: Step1Data;
  onChange: (field: keyof Step1Data, value: string) => void;
}

export function Step1PersonalData({ data, onChange }: Step1Props) {
  const mismatch =
    data.confirmPassword.length > 0 && data.confirmPassword !== data.password;

  return (
    <div className="space-y-4">
      <Input
        id="name"
        name="name"
        label="Nome completo"
        type="text"
        autoComplete="name"
        value={data.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Seu nome completo"
        className="min-h-[48px]"
      />

      <Input
        id="email"
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        value={data.email}
        onChange={(e) => onChange("email", e.target.value)}
        placeholder="seu@email.com"
        className="min-h-[48px]"
      />

      <PasswordInput
        id="password"
        name="password"
        label="Senha"
        autoComplete="new-password"
        value={data.password}
        onChange={(e) => onChange("password", e.target.value)}
        placeholder="Mínimo 8 caracteres"
        showStrength
        className="min-h-[48px]"
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar senha"
        autoComplete="new-password"
        value={data.confirmPassword}
        onChange={(e) => onChange("confirmPassword", e.target.value)}
        placeholder="Digite a senha novamente"
        error={mismatch ? "As senhas não coincidem" : undefined}
        className={`min-h-[48px] ${
          mismatch
            ? "border-red-300 bg-red-50"
            : data.confirmPassword && data.confirmPassword === data.password
              ? "border-teal-300"
              : ""
        }`}
      />
    </div>
  );
}

// ─── Etapa 2 — Perfil ────────────────────────────────────────────────────────

export interface Step2Data {
  isDoctor: boolean;
  crm: string;
  crmState: string;
  specialty: string;
}

interface Step2Props {
  data: Step2Data;
  onChange: (field: keyof Step2Data, value: string | boolean) => void;
}

export function Step2Profile({ data, onChange }: Step2Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-2">
        Informe como você atua para personalizarmos sua experiência.
      </p>

      {/* Cards de perfil */}
      <div className="grid grid-cols-2 gap-3">
        <ProfileCard
          emoji="🩺"
          title="Médico(a)"
          subtitle="Cria solicitações"
          selected={data.isDoctor}
          onClick={() => onChange("isDoctor", true)}
        />
        <ProfileCard
          emoji="🏥"
          title="Gestor / Clínica"
          subtitle="Gerencia a equipe"
          selected={!data.isDoctor}
          onClick={() => onChange("isDoctor", false)}
        />
      </div>

      {/* Campos do médico (condicional) */}
      {data.isDoctor && (
        <div className="space-y-3 p-4 bg-teal-50 rounded-2xl border border-teal-100 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
            Dados do CRM
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="crm"
              name="crm"
              label="CRM"
              required
              type="text"
              value={data.crm}
              onChange={(e) => onChange("crm", e.target.value)}
              placeholder="123456"
              className="min-h-[42px] bg-white"
            />
            <Select
              id="crm-state"
              name="crm-state"
              label="UF"
              required
              value={data.crmState}
              onChange={(e) => onChange("crmState", e.target.value)}
              options={[
                { value: "", label: "UF" },
                ...brazilianStates.map((uf) => ({ value: uf, label: uf })),
              ]}
              className="min-h-[42px] bg-white"
            />
          </div>
          <Input
            id="specialty"
            name="specialty"
            label="Especialidade"
            type="text"
            value={data.specialty}
            onChange={(e) => onChange("specialty", e.target.value)}
            placeholder="Ex: Ortopedia, Cardiologia..."
            className="min-h-[42px] bg-white"
          />
        </div>
      )}
    </div>
  );
}

function ProfileCard({
  emoji,
  title,
  subtitle,
  selected,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? "border-teal-500 bg-teal-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${selected ? "bg-teal-100" : "bg-gray-100"}`}
      >
        {emoji}
      </div>
      <div className="text-center">
        <p
          className={`text-sm font-semibold ${selected ? "text-teal-700" : "text-gray-700"}`}
        >
          {title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {selected && (
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
  );
}

// ─── Etapa 3 — Plano ─────────────────────────────────────────────────────────

interface Step3Props {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  error: string;
  errorType: "" | "email_active" | "email_pending" | "generic";
  isLoading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function Step3Plan({
  plans,
  plansLoading,
  selectedPlanId,
  onSelectPlan,
  error,
  errorType,
  isLoading,
  onBack,
  onSubmit,
}: Step3Props) {
  const getPlanMeta = (name: string) =>
    PLAN_META[name] ?? {
      icon: "📋",
      color: "gray",
      highlight: false,
      features: [],
    };

  return (
    <form onSubmit={onSubmit}>
      {plansLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando planos...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          Não foi possível carregar os planos. Sua conta será criada no plano
          Básico.
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
                onClick={() => onSelectPlan(plan.id)}
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

      {/* Botões da etapa 3 */}
      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          variant="outline"
          className="flex-1 text-sm font-semibold min-h-[48px]"
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          className="flex-[2] text-sm font-semibold min-h-[48px]"
        >
          Criar conta
        </Button>
      </div>
    </form>
  );
}
