import {
  TRILHA_ADMINISTRACAO,
  TRILHA_AGENDA,
  TRILHA_ATENDIMENTO,
  TRILHA_CADASTROS,
  TRILHA_DASHBOARD,
  TRILHA_DOCUMENTOS_MEDICO,
  TRILHA_PLANO,
  TRILHA_SOLICITACOES,
} from "@/lib/onboarding/content";
import type {
  AdminAccountActivation,
  AdminActivationMilestone,
  AdminTeamMember,
} from "@/services/admin.service";

export type ActivationMilestoneKey = AdminActivationMilestone["key"];
export type OnboardingStatus = AdminTeamMember["onboarding"]["status"];
export type OnboardingStepKey =
  AdminAccountActivation["onboarding"]["steps"][number]["key"];
export type OnboardingTrackKey =
  AdminAccountActivation["onboarding"]["tracks"][number]["key"];

export const MILESTONE_LABEL: Record<ActivationMilestoneKey, string> = {
  first_patient: "Primeiro paciente",
  first_appointment: "Primeira consulta",
  first_surgery_request: "Primeira solicitação cirúrgica",
  first_sent_to_insurer: "Primeiro envio ao convênio",
  first_whatsapp: "Primeiro uso do WhatsApp",
};

export const ONBOARDING_STATUS_META: Record<
  OnboardingStatus,
  { label: string; badge: string }
> = {
  not_started: { label: "Não iniciado", badge: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", badge: "bg-blue-50 text-blue-700" },
  dismissed: { label: "Dispensado", badge: "bg-amber-50 text-amber-800" },
  completed: { label: "Concluído", badge: "bg-emerald-50 text-emerald-700" },
};

export const ONBOARDING_STEP_LABEL: Record<OnboardingStepKey, string> = {
  "conhecer-plataforma": "Conhecer a plataforma",
  "criar-solicitacao": "Criar uma solicitação",
  "enviar-solicitacao": "Enviar uma solicitação",
  "criar-por-documento": "Criar solicitação por documento",
  "assinatura-do-medico": "Cadastrar a assinatura do médico",
  "cabecalho-do-medico": "Configurar o cabeçalho do médico",
  "marcar-consulta": "Marcar uma consulta",
  "atender-consulta": "Atender uma consulta",
  "cadastros-basicos": "Fazer os cadastros básicos",
  "convidar-colaborador": "Convidar um colaborador",
  "plano-e-cota": "Ver plano e cota",
  "ver-dashboard": "Ver o dashboard",
};

export const ONBOARDING_TRACK_LABEL: Record<OnboardingTrackKey, string> = {
  "boas-vindas": "Boas-vindas",
  solicitacoes: TRILHA_SOLICITACOES.label,
  "documentos-do-medico": TRILHA_DOCUMENTOS_MEDICO.label,
  atendimento: TRILHA_ATENDIMENTO.label,
  agenda: TRILHA_AGENDA.label,
  cadastros: TRILHA_CADASTROS.label,
  administracao: TRILHA_ADMINISTRACAO.label,
  "plano-e-cota": TRILHA_PLANO.label,
  dashboard: TRILHA_DASHBOARD.label,
};

export function formatDaysAfterSignup(days: number | null): string {
  if (days === null) return "Ainda não aconteceu";
  if (days === 0) return "No dia do cadastro";
  return days === 1 ? "1 dia após o cadastro" : `${days} dias após o cadastro`;
}

export function formatDays(value: number | null): string {
  if (value === null) return "—";
  const text = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(".", ",");
  return value === 1 ? `${text} dia` : `${text} dias`;
}
