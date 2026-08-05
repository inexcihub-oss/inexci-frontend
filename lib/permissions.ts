/**
 * Espelho de `inexci-api/src/shared/permissions/permission.enum.ts`.
 * Os valores viajam pela API — não mude um lado sem o outro.
 */
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
    "Gerenciar colaboradores, cadastros e a assinatura dos médicos.",
};

/**
 * Rota → área. A ordem importa: o primeiro prefixo que casar vence, então
 * prefixos mais específicos vêm antes.
 */
export const ROUTE_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/agenda", permission: Permission.AGENDA },
  { prefix: "/atendimento", permission: Permission.ATENDIMENTO },
  {
    prefix: "/solicitacoes-cirurgicas",
    permission: Permission.SOLICITACOES,
  },
  { prefix: "/solicitacao", permission: Permission.SOLICITACOES },
  { prefix: "/dashboard", permission: Permission.SOLICITACOES },
  { prefix: "/colaboradores", permission: Permission.ADMINISTRACAO },
  // "Procedimentos" edita `SurgeryRequestTemplate` — herda a permissão de
  // classe do `SurgeryRequestsController` (`GET/POST/PATCH/DELETE
  // /surgery-requests/templates/*`), Solicitações, não Administração.
  { prefix: "/procedimentos", permission: Permission.SOLICITACOES },
];

export function permissionForRoute(pathname: string): Permission | null {
  const encontrada = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return encontrada?.permission ?? null;
}

/**
 * Para onde mandar quem não tem Solicitações — o /dashboard deixa de servir
 * como destino padrão de todo mundo. Administração fecha a lista: é a única
 * área do admin delegado, que antes caía em /configuracoes por não ter
 * entrada aqui.
 */
export const HOME_ORDER: { permission: Permission; href: string }[] = [
  { permission: Permission.ATENDIMENTO, href: "/atendimento" },
  { permission: Permission.AGENDA, href: "/agenda" },
  { permission: Permission.SOLICITACOES, href: "/dashboard" },
  { permission: Permission.ADMINISTRACAO, href: "/colaboradores" },
];

/**
 * Único lugar que decide a "casa" de um usuário. Login, guard reverso das telas
 * de auth e `PermissionRouteGuard` chamam esta função — antes cada um tinha o
 * seu próprio destino fixo (`/solicitacoes-cirurgicas`), o que mandava todo
 * usuário sem `solicitacoes` para uma rota proibida antes de ser devolvido.
 */
export function resolveHome(permissions: Permission[]): string {
  if (permissions.includes(Permission.SOLICITACOES)) return "/dashboard";
  const destino = HOME_ORDER.find(({ permission }) =>
    permissions.includes(permission),
  );
  // Sem área nenhuma ainda dá para ver o próprio perfil e sair.
  return destino?.href ?? "/configuracoes";
}

/**
 * Combinações prontas da tela do colaborador. Administração fica de fora de
 * propósito: é concessão consciente, não parte de um perfil.
 */
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

/** Descobre qual preset corresponde à seleção atual, para o seletor. */
export function presetFor(permissions: Permission[]): string {
  const trabalho = permissions
    .filter((p) => p !== Permission.ADMINISTRACAO)
    .sort();
  const achado = Object.entries(PROFILE_PRESETS).find(
    ([, preset]) => [...preset].sort().join(",") === trabalho.join(","),
  );
  return achado?.[0] ?? "personalizado";
}
