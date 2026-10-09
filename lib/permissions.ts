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
