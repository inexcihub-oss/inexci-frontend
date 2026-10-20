export enum Permission {
  AGENDA = "agenda",
  ATENDIMENTO = "atendimento",
  SOLICITACOES = "solicitacoes",
  ADMINISTRACAO = "administracao",
}

export const ALL_PERMISSIONS: Permission[] = [
  Permission.AGENDA,
  Permission.ATENDIMENTO,
  Permission.SOLICITACOES,
  Permission.ADMINISTRACAO,
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.AGENDA]: "Agenda",
  [Permission.ATENDIMENTO]: "Atendimento",
  [Permission.SOLICITACOES]: "Solicitações cirúrgicas",
  [Permission.ADMINISTRACAO]: "Administração",
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.AGENDA]: "Marcar, confirmar e cancelar consultas.",
  [Permission.ATENDIMENTO]: "Abrir o prontuário e o histórico do paciente.",
  [Permission.SOLICITACOES]:
    "Criar e acompanhar solicitações cirúrgicas e o dashboard.",
  [Permission.ADMINISTRACAO]:
    "Gerenciar colaboradores, excluir cadastros e a assinatura da conta.",
};

export function hasAnyArea(permissions: Permission[]): boolean {
  return ALL_PERMISSIONS.some((p) => permissions.includes(p));
}

type RouteAccess = Permission | "any-area";

export const ROUTE_PERMISSIONS: {
  prefix: string;
  permission: RouteAccess;
}[] = [
  { prefix: "/agenda", permission: Permission.AGENDA },
  { prefix: "/atendimento", permission: Permission.ATENDIMENTO },
  {
    prefix: "/solicitacoes-cirurgicas",
    permission: Permission.SOLICITACOES,
  },
  { prefix: "/solicitacao", permission: Permission.SOLICITACOES },
  { prefix: "/dashboard", permission: Permission.SOLICITACOES },
  { prefix: "/colaboradores/hospital", permission: "any-area" },
  { prefix: "/colaboradores/convenio", permission: "any-area" },
  { prefix: "/colaboradores/fornecedor", permission: "any-area" },
  { prefix: "/colaboradores/fabricante", permission: "any-area" },
  { prefix: "/colaboradores", permission: Permission.ADMINISTRACAO },
  { prefix: "/procedimentos", permission: Permission.SOLICITACOES },
  { prefix: "/clinicas", permission: Permission.ADMINISTRACAO },
];

export function permissionForRoute(pathname: string): Permission | null {
  const encontrada = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return encontrada?.permission === "any-area"
    ? null
    : (encontrada?.permission ?? null);
}

export function routeRequiresAnyArea(pathname: string): boolean {
  return ROUTE_PERMISSIONS.some(
    ({ prefix, permission }) =>
      permission === "any-area" &&
      (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

export const HOME_ORDER: { permission: Permission; href: string }[] = [
  { permission: Permission.ATENDIMENTO, href: "/atendimento" },
  { permission: Permission.AGENDA, href: "/agenda" },
  { permission: Permission.SOLICITACOES, href: "/dashboard" },
  { permission: Permission.ADMINISTRACAO, href: "/colaboradores" },
];

export function resolveHome(permissions: Permission[]): string {
  const destino = HOME_ORDER.find(({ permission }) =>
    permissions.includes(permission),
  );
  return destino?.href ?? "/configuracoes";
}

export const PROFILE_PRESETS: Record<string, Permission[]> = {
  atendimento: [Permission.AGENDA, Permission.ATENDIMENTO],
  cirurgia: [Permission.AGENDA, Permission.SOLICITACOES],
  completo: [
    Permission.AGENDA,
    Permission.ATENDIMENTO,
    Permission.SOLICITACOES,
  ],
};

export const PROFILE_LABELS: Record<string, string> = {
  atendimento: "Atendimento e agenda",
  cirurgia: "Agenda e solicitações cirúrgicas",
  completo: "Acesso completo",
  personalizado: "Personalizado",
};

export function presetFor(permissions: Permission[]): string {
  const trabalho = permissions
    .filter((p) => p !== Permission.ADMINISTRACAO)
    .sort();
  const achado = Object.entries(PROFILE_PRESETS).find(
    ([, preset]) => [...preset].sort().join(",") === trabalho.join(","),
  );
  return achado?.[0] ?? "personalizado";
}

export type NavGroup = "cadastros";

export interface NavItem {
  label: string;
  shortLabel?: string;
  href: string;
  iconSrc: string;
  group?: NavGroup;
  mobile: { slot: "primary" | "overflow"; order: number };
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Atendimento",
    href: "/atendimento",
    iconSrc: "/icons/stethoscope.svg",
    mobile: { slot: "primary", order: 0 },
  },
  {
    label: "Agenda",
    href: "/agenda",
    iconSrc: "/icons/calendar-schedule.svg",
    mobile: { slot: "primary", order: 1 },
  },
  {
    label: "Solicitações Cirúrgicas",
    shortLabel: "Solicitações",
    href: "/solicitacoes-cirurgicas",
    iconSrc: "/icons/grid-layout.svg",
    mobile: { slot: "primary", order: 2 },
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    iconSrc: "/icons/dashboard.svg",
    mobile: { slot: "overflow", order: 0 },
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    iconSrc: "/icons/user-add.svg",
    mobile: { slot: "primary", order: 3 },
  },
  {
    label: "Colaboradores",
    href: "/colaboradores",
    iconSrc: "/icons/user-profile.svg",
    mobile: { slot: "overflow", order: 7 },
  },
  {
    label: "Clínicas",
    href: "/clinicas",
    iconSrc: "/icons/clinic-building.svg",
    group: "cadastros",
    mobile: { slot: "overflow", order: 2 },
  },
  {
    label: "Hospitais",
    href: "/hospitais",
    iconSrc: "/icons/users.svg",
    group: "cadastros",
    mobile: { slot: "overflow", order: 3 },
  },
  {
    label: "Convênios",
    href: "/convenios",
    iconSrc: "/icons/document.svg",
    group: "cadastros",
    mobile: { slot: "overflow", order: 4 },
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    iconSrc: "/icons/dollar-cash-circle.svg",
    group: "cadastros",
    mobile: { slot: "overflow", order: 5 },
  },
  {
    label: "Fabricantes",
    href: "/fabricantes",
    iconSrc: "/icons/user.svg",
    group: "cadastros",
    mobile: { slot: "overflow", order: 6 },
  },
  {
    label: "Procedimentos",
    href: "/procedimentos",
    iconSrc: "/icons/status-surgeries.svg",
    mobile: { slot: "overflow", order: 1 },
  },
];

export function navItemPermission(
  item: Pick<NavItem, "href">,
): Permission | null {
  return permissionForRoute(item.href);
}

export function mobileNavItems(slot: NavItem["mobile"]["slot"]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.mobile.slot === slot).sort(
    (a, b) => a.mobile.order - b.mobile.order,
  );
}

export const CADASTROS_HREFS = NAV_ITEMS.filter(
  (item) => item.group === "cadastros",
).map((item) => item.href);
