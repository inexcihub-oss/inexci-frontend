"use client";

import {
  Briefcase,
  Building2,
  Crown,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import { Input, Select } from "@/components/ui";
import { PasswordInput } from "@/components/ui";
import { BRAZILIAN_STATES } from "@/lib/options";
import type { SubscriptionPlan } from "@/types";
import { PlanCard, type PlanCardTheme } from "@/components/cadastro/PlanCard";

// ─── Constantes ──────────────────────────────────────────────────────────────

/** @deprecated Use BRAZILIAN_STATES from @/lib/options */
export { BRAZILIAN_STATES as brazilianStates } from "@/lib/options";

/**
 * Metadata visual por slug de plano: \u00edcone, tema de cores, features extras.
 * Mantemos aqui (e n\u00e3o no backend) porque s\u00e3o decis\u00f5es puramente de design.
 */
export interface PlanPresentation {
  icon: LucideIcon;
  theme: PlanCardTheme;
  highlight?: boolean;
  features: string[];
}

const SHARED_FEATURES = [
  "Médicos e colaboradores ilimitados",
  "Kanban e gestão de solicitações cirúrgicas",
  "Assistente de IA via WhatsApp",
  "Notificações por e-mail e WhatsApp",
  "Relatórios e exportação CSV/PDF",
  "Suporte por chat e e-mail",
];

export const PLAN_PRESENTATION: Record<string, PlanPresentation> = {
  starter: {
    icon: Sparkles,
    features: SHARED_FEATURES,
    theme: {
      accent: "bg-teal-500 hover:bg-teal-600",
      iconBg: "bg-teal-500",
      iconColor: "text-white",
      checkColor: "text-teal-500",
      ringBorder: "border-teal-500",
      selectedBg: "bg-teal-50/40",
      priceColor: "text-teal-600",
    },
  },
  essencial: {
    icon: Briefcase,
    features: SHARED_FEATURES,
    theme: {
      accent: "bg-blue-500 hover:bg-blue-600",
      iconBg: "bg-blue-500",
      iconColor: "text-white",
      checkColor: "text-blue-500",
      ringBorder: "border-blue-500",
      selectedBg: "bg-blue-50/40",
      priceColor: "text-blue-600",
    },
  },
  profissional: {
    icon: Crown,
    highlight: true,
    features: SHARED_FEATURES,
    theme: {
      accent: "bg-purple-600 hover:bg-purple-700",
      iconBg: "bg-purple-600",
      iconColor: "text-white",
      checkColor: "text-purple-600",
      ringBorder: "border-purple-500",
      selectedBg: "bg-purple-50/50",
      priceColor: "text-purple-600",
      highlightGradient: "from-white via-purple-50/40 to-fuchsia-50/40",
    },
  },
  avancado: {
    icon: Building2,
    features: SHARED_FEATURES,
    theme: {
      accent: "bg-indigo-600 hover:bg-indigo-700",
      iconBg: "bg-indigo-600",
      iconColor: "text-white",
      checkColor: "text-indigo-600",
      ringBorder: "border-indigo-500",
      selectedBg: "bg-indigo-50/40",
      priceColor: "text-indigo-600",
    },
  },
  enterprise: {
    icon: Building2,
    features: [
      ...SHARED_FEATURES,
      "SLA dedicado e gerente de conta",
      "Integrações personalizadas",
      "Auditoria avançada e compliance",
    ],
    theme: {
      accent: "bg-gray-800 hover:bg-gray-900",
      iconBg: "bg-gray-800",
      iconColor: "text-white",
      checkColor: "text-gray-600",
      ringBorder: "border-gray-700",
      selectedBg: "bg-gray-50/60",
      priceColor: "text-gray-700",
    },
  },
};

function getPresentation(slug: string): PlanPresentation {
  // Annual plans (slug ending in -anual) use the base tier presentation
  const baseSlug = slug.endsWith("-anual") ? slug.slice(0, -6) : slug;
  return (
    PLAN_PRESENTATION[baseSlug] ?? {
      icon: Sparkles,
      features: [],
      theme: PLAN_PRESENTATION.starter.theme,
    }
  );
}

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
  phone: string;
  password: string;
  confirmPassword: string;
}

interface Step1Props {
  data: Step1Data;
  onChange: (field: keyof Step1Data, value: string) => void;
  fieldErrors?: Partial<Record<keyof Step1Data, string>>;
}

export function Step1PersonalData({ data, onChange, fieldErrors }: Step1Props) {
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
        error={fieldErrors?.name}
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
        error={fieldErrors?.email}
      />

      <Input
        id="phone"
        name="phone"
        label="Telefone"
        type="tel"
        autoComplete="tel"
        mask="phone"
        value={data.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        placeholder="(00) 00000-0000"
        className="min-h-[48px]"
        error={fieldErrors?.phone}
      />

      <PasswordInput
        id="password"
        name="password"
        label="Senha"
        autoComplete="new-password"
        showRequirements
        value={data.password}
        onChange={(e) => onChange("password", e.target.value)}
        placeholder="Mínimo 8 caracteres"
        className="min-h-[48px]"
        error={fieldErrors?.password}
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar senha"
        autoComplete="new-password"
        value={data.confirmPassword}
        onChange={(e) => onChange("confirmPassword", e.target.value)}
        placeholder="Digite a senha novamente"
        className="min-h-[48px]"
        error={fieldErrors?.confirmPassword}
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
  fieldErrors?: Partial<Record<keyof Step2Data, string>>;
}

export function Step2Profile({ data, onChange, fieldErrors }: Step2Props) {
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
              type="text"
              value={data.crm}
              onChange={(e) => onChange("crm", e.target.value)}
              placeholder="123456"
              className="min-h-[42px] bg-white"
              error={fieldErrors?.crm}
            />
            <Select
              id="crm-state"
              name="crm-state"
              label="UF"
              value={data.crmState}
              onChange={(e) => onChange("crmState", e.target.value)}
              options={[
                { value: "", label: "Selecione" },
                ...BRAZILIAN_STATES.map((uf) => ({ value: uf, label: uf })),
              ]}
              className="min-h-[42px] bg-white"
              error={fieldErrors?.crmState}
            />
          </div>
          <Input
            id="specialty"
            name="specialty"
            label="Especialidade (opcional)"
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

// ─── Etapa 3 — Sele\u00e7\u00e3o de plano ──────────────────────────────────────────────

interface Step3PlanProps {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  selectedSlug: string;
  onSelectPlan: (slug: string) => void;
  billingPeriod: "MONTHLY" | "YEARLY";
  onBillingPeriodChange: (p: "MONTHLY" | "YEARLY") => void;
  stripeLoaded: boolean;
  cardHolderName: string;
  onCardHolderNameChange: (v: string) => void;
  cardHolderNameError: string;
  cardError: string;
}

export function Step3Plan({
  plans,
  plansLoading,
  selectedSlug,
  onSelectPlan,
  billingPeriod,
  onBillingPeriodChange,
  stripeLoaded,
  cardHolderName,
  onCardHolderNameChange,
  cardHolderNameError,
  cardError,
}: Step3PlanProps) {
  // Enterprise é sempre exibido (sem versão anual separada)
  const enterprisePlan = plans.find((p) => p.slug === "enterprise");
  const sortedPlans = [...plans]
    .filter((p) => p.slug !== "enterprise" && p.billingPeriod === billingPeriod)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedPlan = [...plans].find((p) => p.slug === selectedSlug);

  return (
    <div className="space-y-6">
      {/* Toggle Mensal / Anual */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onBillingPeriodChange("MONTHLY")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              billingPeriod === "MONTHLY"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => onBillingPeriodChange("YEARLY")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              billingPeriod === "YEARLY"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Anual
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
              -2 meses
            </span>
          </button>
        </div>
      </div>

      {/* Grid de planos */}
      {plansLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando planos...</p>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Não foi possível carregar os planos no momento. Sua conta será criada
          no plano Starter com 30 dias grátis e você poderá mudar depois.
        </div>
      ) : (
        <>
          {/* Mobile: carrossel */}
          <div className="sm:hidden -mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...sortedPlans, ...(enterprisePlan ? [enterprisePlan] : [])].map((plan) => {
                const presentation = getPresentation(plan.slug);
                return (
                  <div
                    key={plan.id}
                    className="snap-center shrink-0 w-[78vw] max-w-[280px]"
                  >
                    <PlanCard
                      plan={plan}
                      features={presentation.features}
                      icon={presentation.icon}
                      theme={presentation.theme}
                      highlight={presentation.highlight}
                      selected={plan.slug === selectedSlug}
                      onSelect={plan.slug === "enterprise" ? () => {} : () => onSelectPlan(plan.slug)}
                    />
                  </div>
                );
              })}
            </div>
            {/* Indicadores de paginação */}
            <div className="flex justify-center gap-1.5 mt-2">
              {[...sortedPlans, ...(enterprisePlan ? [enterprisePlan] : [])].map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={plan.slug === "enterprise" ? () => {} : () => onSelectPlan(plan.slug)}
                  className={`h-1.5 rounded-full transition-all ${
                    plan.slug === selectedSlug
                      ? "w-4 bg-teal-500"
                      : "w-1.5 bg-gray-300"
                  }`}
                  aria-label={`Selecionar ${plan.name}`}
                />
              ))}
            </div>
          </div>

          {/* Tablet/Desktop: grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5 items-stretch">
            {[...sortedPlans, ...(enterprisePlan ? [enterprisePlan] : [])].map((plan) => {
              const presentation = getPresentation(plan.slug);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  features={presentation.features}
                  icon={presentation.icon}
                  theme={presentation.theme}
                  highlight={presentation.highlight}
                  selected={plan.slug === selectedSlug}
                  onSelect={plan.slug === "enterprise" ? () => {} : () => onSelectPlan(plan.slug)}
                />
              );
            })}
          </div>

          {/* Formulário de cartão — apenas para planos pagos */}
          {selectedPlan && !selectedPlan.isTrialDefault && selectedPlan.slug !== "enterprise" && (
            <StripeCardSection
              stripeLoaded={stripeLoaded}
              holderName={cardHolderName}
              onHolderNameChange={onCardHolderNameChange}
              holderNameError={cardHolderNameError}
              cardError={cardError}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Formulário Stripe inline ─────────────────────────────────────────────────

interface StripeCardSectionProps {
  stripeLoaded: boolean;
  holderName: string;
  onHolderNameChange: (v: string) => void;
  holderNameError: string;
  cardError: string;
}

export function StripeCardSection({
  stripeLoaded,
  holderName,
  onHolderNameChange,
  holderNameError,
  cardError,
}: StripeCardSectionProps) {
  return (
    <div className="max-w-2xl mx-auto mt-2 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Dados do cartão de crédito
      </h3>
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 mb-4">
        <span>
          Dados coletados diretamente pelo Stripe (PCI-DSS nível 1). Nunca
          passam pelo nosso servidor.
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome impresso no cartão <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => onHolderNameChange(e.target.value)}
            placeholder="Como aparece no cartão"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            autoComplete="cc-name"
          />
          {holderNameError && (
            <p className="mt-1 text-xs text-red-600">{holderNameError}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dados do cartão <span className="text-red-500">*</span>
          </label>
          {stripeLoaded ? (
            <div
              id="stripe-card-element-signup"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition"
            />
          ) : (
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-400">
              Carregando...
            </div>
          )}
          {cardError && (
            <p className="mt-1 text-xs text-red-600">{cardError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
