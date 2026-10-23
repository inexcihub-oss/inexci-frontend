import {
  Bell,
  CalendarClock,
  CalendarOff,
  Compass,
  CreditCard,
  FileText,
  KeyRound,
  LayoutTemplate,
  MessageSquareText,
  ShieldCheck,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SettingsTab =
  | "profile"
  | "notifications"
  | "plan"
  | "security"
  | "header"
  | "privacy"
  | "onboarding"
  | "document-templates"
  | "clinical-snippets"
  | "my-schedule"
  | "holidays"
  | "patient-notices";

export const BILLING_TAB_ENABLED = true;

export interface SettingsTabAccess {
  isAccountOwner: boolean;
  emiteDocumentos: boolean;
  isDoctor: boolean;
  podeAdministrar: boolean;
  hasUser: boolean;
}

const ALL_TABS: readonly SettingsTab[] = [
  "header",
  "profile",
  "notifications",
  "plan",
  "security",
  "privacy",
  "onboarding",
  "document-templates",
  "clinical-snippets",
  "my-schedule",
  "holidays",
  "patient-notices",
];

export function resolveSettingsTab(
  tab: string | null,
  acesso: SettingsTabAccess,
): SettingsTab | null {
  if (tab === "plan" && !acesso.isAccountOwner) return "profile";
  if (
    tab === "document-templates" &&
    !(acesso.emiteDocumentos && acesso.hasUser)
  )
    return "profile";
  if (
    (tab === "my-schedule" || tab === "clinical-snippets") &&
    !(acesso.isDoctor && acesso.hasUser)
  )
    return "profile";
  if (
    (tab === "holidays" || tab === "patient-notices") &&
    !acesso.podeAdministrar
  )
    return "profile";
  return (ALL_TABS as readonly string[]).includes(tab ?? "")
    ? (tab as SettingsTab)
    : null;
}

export interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

export interface SettingsNavGroup {
  id: string;
  label: string;
  items: SettingsNavItem[];
}

export interface SettingsNavAccess extends SettingsTabAccess {
  mostraCabecalho: boolean;
}

export function settingsNavGroups(
  acesso: SettingsNavAccess,
): SettingsNavGroup[] {
  const grupos: SettingsNavGroup[] = [
    {
      id: "conta",
      label: "Minha conta",
      items: [
        { id: "profile", label: "Perfil", icon: User },
        { id: "security", label: "Segurança", icon: KeyRound },
        { id: "notifications", label: "Notificações", icon: Bell },
      ],
    },
    {
      id: "atendimento",
      label: "Atendimento",
      items: [
        ...(acesso.isDoctor && acesso.hasUser
          ? [
              {
                id: "my-schedule" as const,
                label: "Minha agenda",
                icon: CalendarClock,
              },
              {
                id: "clinical-snippets" as const,
                label: "Textos rápidos",
                icon: Zap,
              },
            ]
          : []),
        ...(acesso.mostraCabecalho
          ? [
              {
                id: "header" as const,
                label: "Cabeçalho de documentos",
                icon: LayoutTemplate,
              },
            ]
          : []),
        ...(acesso.emiteDocumentos && acesso.hasUser
          ? [
              {
                id: "document-templates" as const,
                label: "Modelos de documentos",
                icon: FileText,
              },
            ]
          : []),
      ],
    },
    {
      id: "clinica",
      label: "Clínica",
      items: [
        ...(acesso.podeAdministrar
          ? [
              {
                id: "holidays" as const,
                label: "Feriados",
                icon: CalendarOff,
              },
              {
                id: "patient-notices" as const,
                label: "Avisos aos pacientes",
                icon: MessageSquareText,
              },
            ]
          : []),
        ...(acesso.isAccountOwner && BILLING_TAB_ENABLED
          ? [
              {
                id: "plan" as const,
                label: "Plano e faturamento",
                icon: CreditCard,
              },
            ]
          : []),
      ],
    },
    {
      id: "ajuda",
      label: "Ajuda",
      items: [
        { id: "onboarding", label: "Primeiros passos", icon: Compass },
        { id: "privacy", label: "Privacidade e termos", icon: ShieldCheck },
      ],
    },
  ];
  return grupos.filter((grupo) => grupo.items.length > 0);
}
