export type SettingsTab =
  | "profile"
  | "notifications"
  | "plan"
  | "security"
  | "header"
  | "privacy"
  | "onboarding"
  | "document-templates"
  | "my-schedule"
  | "holidays";

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
  "my-schedule",
  "holidays",
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
  if (tab === "my-schedule" && !(acesso.isDoctor && acesso.hasUser))
    return "profile";
  if (tab === "holidays" && !acesso.podeAdministrar) return "profile";
  return (ALL_TABS as readonly string[]).includes(tab ?? "")
    ? (tab as SettingsTab)
    : null;
}
