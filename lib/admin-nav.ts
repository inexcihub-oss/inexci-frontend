import {
  Activity,
  Building2,
  History,
  Layers,
  LayoutDashboard,
  ListTodo,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  TriangleAlert,
  Wallet,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavSection {
  id: string;
  label: string | null;
  items: AdminNavItem[];
}

export const ADMIN_BASE_PATH = "/admin";
export const ADMIN_HOME_PATH = "/admin/dashboard";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_PUBLIC_PATHS = [ADMIN_LOGIN_PATH, "/admin/primeiro-acesso"];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "geral",
    label: null,
    items: [
      { label: "Dashboard", href: ADMIN_HOME_PATH, icon: LayoutDashboard },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    items: [
      { label: "Contas", href: "/admin/clientes", icon: Building2 },
      { label: "Uso da plataforma", href: "/admin/uso", icon: Activity },
    ],
  },
  {
    id: "receita",
    label: "Receita",
    items: [
      { label: "Faturamento", href: "/admin/faturamento", icon: Wallet },
      { label: "Cupons", href: "/admin/cupons", icon: TicketPercent },
      { label: "Planos", href: "/admin/planos", icon: Layers },
      { label: "Eventos da Stripe", href: "/admin/stripe", icon: Webhook },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    items: [
      { label: "Uso de IA", href: "/admin/ia", icon: Sparkles },
      { label: "Envios", href: "/admin/envios", icon: Send },
      { label: "Erros", href: "/admin/erros", icon: TriangleAlert },
      { label: "Filas", href: "/admin/filas", icon: ListTodo },
      { label: "Segurança", href: "/admin/seguranca", icon: ShieldAlert },
      { label: "Sistema", href: "/admin/sistema", icon: Server },
    ],
  },
  {
    id: "equipe",
    label: "Equipe Inexci",
    items: [
      { label: "Administradores", href: "/admin/equipe", icon: ShieldCheck },
      { label: "Histórico de ações", href: "/admin/historico", icon: History },
    ],
  },
];

export function isAdminRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function matchesPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC_PATHS.some((base) => matchesPath(pathname, base));
}

export function resolveAdminNext(next: string | null | undefined): string {
  if (!next) return ADMIN_HOME_PATH;
  if (next.includes("//") || next.includes("\\")) return ADMIN_HOME_PATH;
  const pathname = next.split(/[?#]/)[0];
  if (!matchesPath(pathname, ADMIN_BASE_PATH)) return ADMIN_HOME_PATH;
  if (pathname === ADMIN_BASE_PATH || isAdminPublicPath(pathname)) {
    return ADMIN_HOME_PATH;
  }
  return next;
}

export function buildAdminLoginUrl(next: string): string {
  return `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
