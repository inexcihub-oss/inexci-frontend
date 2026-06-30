"use client";

import {
  Briefcase,
  Building2,
  Check,
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

export interface PlanPresentation {
  icon: LucideIcon;
  theme: PlanCardTheme;
  highlight?: boolean;
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
    theme: {
      headerGradient: "from-teal-400 to-emerald-600",
      ring: "border-teal-500",
      ctaBg: "bg-teal-500",
      priceColor: "text-teal-600",
      dotColor: "bg-teal-500",
      glowShadow: "shadow-teal-200",
      badgeBg: "bg-teal-500",
    },
  },
  essencial: {
    icon: Briefcase,
    theme: {
      headerGradient: "from-blue-500 to-indigo-600",
      ring: "border-blue-500",
      ctaBg: "bg-blue-500",
      priceColor: "text-blue-600",
      dotColor: "bg-blue-500",
      glowShadow: "shadow-blue-200",
      badgeBg: "bg-blue-500",
    },
  },
  profissional: {
    icon: Crown,
    highlight: true,
    theme: {
      headerGradient: "from-violet-600 to-fuchsia-600",
      ring: "border-purple-500",
      ctaBg: "bg-purple-600",
      priceColor: "text-purple-600",
      dotColor: "bg-purple-500",
      glowShadow: "shadow-purple-200",
      badgeBg: "bg-purple-600",
    },
  },
  avancado: {
    icon: Building2,
    theme: {
      headerGradient: "from-indigo-600 to-blue-700",
      ring: "border-indigo-500",
      ctaBg: "bg-indigo-600",
      priceColor: "text-indigo-600",
      dotColor: "bg-indigo-500",
      glowShadow: "shadow-indigo-200",
      badgeBg: "bg-indigo-600",
    },
  },
  enterprise: {
    icon: Building2,
    theme: {
      headerGradient: "from-gray-700 to-slate-900",
      ring: "border-gray-700",
      ctaBg: "bg-gray-800",
      priceColor: "text-gray-700",
      dotColor: "bg-gray-500",
      glowShadow: "shadow-gray-300",
      badgeBg: "bg-gray-800",
    },
  },
};

export function getPresentation(slug: string): PlanPresentation {
  // Annual plans (slug ending in -anual) use the base tier presentation
  const baseSlug = slug.endsWith("-anual") ? slug.slice(0, -6) : slug;
  return (
    PLAN_PRESENTATION[baseSlug] ?? {
      icon: Sparkles,
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

// ─── Etapa 3 — Seleção de plano ────────────────────────────────────────────────

interface Step3PlanProps {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  selectedSlug: string;
  onSelectPlan: (slug: string) => void;
  billingPeriod: "MONTHLY" | "YEARLY";
  onBillingPeriodChange: (p: "MONTHLY" | "YEARLY") => void;
}

export function Step3Plan({
  plans,
  plansLoading,
  selectedSlug,
  onSelectPlan,
  billingPeriod,
  onBillingPeriodChange,
}: Step3PlanProps) {
  const enterprisePlan = plans.find((p) => p.slug === "enterprise");
  const sortedPlans = [...plans]
    .filter((p) => p.slug !== "enterprise" && p.billingPeriod === billingPeriod)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const allPlans = [...sortedPlans, ...(enterprisePlan ? [enterprisePlan] : [])];

  const gridColsClass: Record<number, string> = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  };
  const colClass =
    gridColsClass[allPlans.length] ??
    "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

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

      {plansLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando planos...</p>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Não foi possível carregar os planos. Sua conta será criada no plano
          Starter com 30 dias grátis e você poderá fazer upgrade depois.
        </div>
      ) : (
        <>
          {/* Mobile: carrossel */}
          <div className="sm:hidden -mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {allPlans.map((plan) => {
                const presentation = getPresentation(plan.slug);
                return (
                  <div
                    key={plan.id}
                    className="snap-center shrink-0 w-[72vw] max-w-[260px]"
                  >
                    <PlanCard
                      plan={plan}
                      icon={presentation.icon}
                      theme={presentation.theme}
                      highlight={presentation.highlight}
                      selected={plan.slug === selectedSlug}
                      onSelect={
                        plan.slug === "enterprise"
                          ? () => {}
                          : () => onSelectPlan(plan.slug)
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-1.5 mt-2">
              {allPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={
                    plan.slug === "enterprise"
                      ? () => {}
                      : () => onSelectPlan(plan.slug)
                  }
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

          {/* Tablet/Desktop: grid dinâmico */}
          <div className={`hidden sm:grid gap-5 items-stretch ${colClass}`}>
            {allPlans.map((plan) => {
              const presentation = getPresentation(plan.slug);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  icon={presentation.icon}
                  theme={presentation.theme}
                  highlight={presentation.highlight}
                  selected={plan.slug === selectedSlug}
                  onSelect={
                    plan.slug === "enterprise"
                      ? () => {}
                      : () => onSelectPlan(plan.slug)
                  }
                />
              );
            })}
          </div>

          {/* Features compartilhadas */}
          <SharedFeaturesSection />
        </>
      )}
    </div>
  );
}

function SharedFeaturesSection() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4 text-center">
        Incluído em todos os planos
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
        {SHARED_FEATURES.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-teal-500" strokeWidth={3} />
            </div>
            <span className="text-[11px] text-gray-600 leading-tight">
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
