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

export const PLAN_PRESENTATION: Record<string, PlanPresentation> = {
  starter: {
    icon: Sparkles,
    features: [
      "1 médico cadastrado",
      "Equipe de até 2 colaboradores",
      "Suporte por e-mail",
      "Notificações por WhatsApp",
    ],
    theme: {
      gradient: "from-slate-800 via-slate-800 to-slate-900",
      accent: "bg-teal-400",
      badgeBg: "bg-teal-500",
      badgeText: "text-white",
      ring: "border-teal-400/80",
      buttonBg: "bg-teal-500 hover:bg-teal-600",
      buttonText: "text-white",
      iconBg: "bg-teal-500/15",
      iconColor: "text-teal-300",
    },
  },
  essencial: {
    icon: Briefcase,
    features: [
      "Médicos ilimitados",
      "Colaboradores ilimitados",
      "Templates de procedimentos",
      "Notificações por e-mail e WhatsApp",
      "Relatórios e exportação CSV/PDF",
    ],
    theme: {
      gradient: "from-slate-800 via-blue-900/40 to-slate-900",
      accent: "bg-blue-400",
      badgeBg: "bg-blue-500",
      badgeText: "text-white",
      ring: "border-blue-400/80",
      buttonBg: "bg-blue-500 hover:bg-blue-600",
      buttonText: "text-white",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-300",
    },
  },
  profissional: {
    icon: Crown,
    highlight: true,
    features: [
      "Tudo do Essencial",
      "Assistente de IA via WhatsApp",
      "Transcrição de áudios médicos",
      "Suporte prioritário",
      "Onboarding guiado da equipe",
    ],
    theme: {
      gradient: "from-purple-700 via-fuchsia-700 to-indigo-800",
      accent: "bg-purple-400",
      badgeBg: "bg-amber-400",
      badgeText: "text-amber-950",
      ring: "border-fuchsia-300",
      buttonBg: "bg-white hover:bg-white/90",
      buttonText: "text-purple-700",
      iconBg: "bg-white/15",
      iconColor: "text-amber-200",
    },
  },
  enterprise: {
    icon: Building2,
    features: [
      "Tudo do Profissional",
      "SLA dedicado e gerente de conta",
      "Integrações personalizadas",
      "Treinamento exclusivo da equipe",
      "Auditoria avançada e compliance",
    ],
    theme: {
      gradient: "from-slate-900 via-indigo-950 to-black",
      accent: "bg-indigo-400",
      badgeBg: "bg-indigo-500",
      badgeText: "text-white",
      ring: "border-indigo-300",
      buttonBg: "bg-indigo-500 hover:bg-indigo-600",
      buttonText: "text-white",
      iconBg: "bg-indigo-500/15",
      iconColor: "text-indigo-300",
    },
  },
};

function getPresentation(slug: string): PlanPresentation {
  return (
    PLAN_PRESENTATION[slug] ?? {
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
        required
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
        required
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
        required
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
        required
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
        required
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
              required
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
              required
              value={data.crmState}
              onChange={(e) => onChange("crmState", e.target.value)}
              options={[
                { value: "", label: "UF" },
                ...BRAZILIAN_STATES.map((uf) => ({ value: uf, label: uf })),
              ]}
              className="min-h-[42px] bg-white"
              error={fieldErrors?.crmState}
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

// ─── Etapa 3 — Sele\u00e7\u00e3o de plano ──────────────────────────────────────────────

interface Step3PlanProps {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  /** Slug do plano selecionado. */
  selectedSlug: string;
  onSelectPlan: (slug: string) => void;
  /** Quando true, exibe selo "Free Trial" no card e oculta o pre\u00e7o. */
  trialMode: boolean;
  onToggleTrialMode: (value: boolean) => void;
}

export function Step3Plan({
  plans,
  plansLoading,
  selectedSlug,
  onSelectPlan,
  trialMode,
  onToggleTrialMode,
}: Step3PlanProps) {
  const sortedPlans = [...plans]
    .filter((p) => p.slug !== "free-trial")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Toggle Free Trial vs Plano */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            {trialMode ? "Comece com 30 dias grátis" : "Escolha seu plano"}
          </h3>
          <p className="text-xs text-white/60 mt-1">
            {trialMode
              ? "Você usa todos os recursos do plano escolhido por 30 dias, sem cartão."
              : "Todos os planos começam com 30 dias grátis. Você decide depois."}
          </p>
        </div>
        <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onToggleTrialMode(true)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-all ${
              trialMode
                ? "bg-teal-500 text-white shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Free Trial
          </button>
          <button
            type="button"
            onClick={() => onToggleTrialMode(false)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-all ${
              !trialMode
                ? "bg-white text-slate-900 shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Ver preços
          </button>
        </div>
      </div>

      {/* Grid de planos */}
      {plansLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/60">Carregando planos...</p>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-5 text-sm text-amber-200">
          Não foi possível carregar os planos no momento. Sua conta será criada
          em modo Free Trial e você poderá escolher um plano depois.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {sortedPlans.map((plan) => {
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
                onSelect={() => onSelectPlan(plan.slug)}
                trialMode={trialMode}
              />
            );
          })}
        </div>
      )}

      {/* Garantias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {[
          { icon: "🔒", text: "Pagamento seguro com criptografia" },
          { icon: "🔄", text: "Cancele a qualquer momento" },
          { icon: "🎁", text: "30 dias grátis em todos os planos" },
        ].map((g) => (
          <div
            key={g.text}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm"
          >
            <span className="text-xl">{g.icon}</span>
            <span className="text-xs text-white/80">{g.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

