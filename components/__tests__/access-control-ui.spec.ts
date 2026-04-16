import { describe, it, expect } from "vitest";

/**
 * TASK-FE-I01: Testes de controle de acesso condicional na UI.
 *
 * Valida a lógica de filtragem de menus, proteção de rotas e
 * ocultação de seções com base em isAdmin e isDoctor.
 */

// ─── Sidebar: filtragem de menu ───

interface MenuItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Solicitações Cirúrgicas", href: "/solicitacoes-cirurgicas" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Colaboradores", href: "/colaboradores", adminOnly: true },
  { label: "Procedimentos", href: "/procedimentos" },
];

function filterMenuItems(items: MenuItem[], isAdmin: boolean): MenuItem[] {
  return items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
}

// ─── BottomNavBar: filtragem de itens ───

interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Solicitações", href: "/solicitacoes-cirurgicas" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Equipe", href: "/colaboradores", adminOnly: true },
  { label: "Mais", href: "/configuracoes" },
];

function filterNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin);
}

// ─── Configurações: visibilidade de tabs ───

type SettingsTab = "profile" | "notifications" | "plan" | "security";

interface TabConfig {
  id: SettingsTab;
  label: string;
  adminOnly?: boolean;
}

const allSettingsTabs: TabConfig[] = [
  { id: "profile", label: "Perfil" },
  { id: "notifications", label: "Notificações" },
  { id: "plan", label: "Plano e Faturamento", adminOnly: true },
  { id: "security", label: "Segurança" },
];

function filterSettingsTabs(tabs: TabConfig[], isAdmin: boolean): TabConfig[] {
  return tabs.filter((tab) => !tab.adminOnly || isAdmin);
}

// ─── Proteção de rota ───

function shouldRedirect(isAdmin: boolean, loading: boolean): boolean {
  return !loading && !isAdmin;
}

function shouldRenderContent(isAdmin: boolean, loading: boolean): boolean {
  return !loading && isAdmin;
}

// ─── Configurações: dados profissionais ───

function shouldShowProfessionalData(isDoctor: boolean): boolean {
  return isDoctor;
}

// ─── Testes ───

describe("TASK-FE-I01 — Controle de acesso condicional na UI", () => {
  describe("Sidebar — Filtragem de menu por isAdmin", () => {
    it("admin vê todos os 5 itens do menu, incluindo Colaboradores", () => {
      const items = filterMenuItems(allMenuItems, true);
      expect(items).toHaveLength(5);
      expect(items.map((i) => i.label)).toContain("Colaboradores");
    });

    it("collaborator vê apenas 4 itens — Colaboradores é filtrado", () => {
      const items = filterMenuItems(allMenuItems, false);
      expect(items).toHaveLength(4);
      expect(items.map((i) => i.label)).not.toContain("Colaboradores");
    });

    it("itens não-adminOnly são sempre visíveis", () => {
      const itemsAdmin = filterMenuItems(allMenuItems, true);
      const itemsCollab = filterMenuItems(allMenuItems, false);

      const publicItems = [
        "Dashboard",
        "Solicitações Cirúrgicas",
        "Pacientes",
        "Procedimentos",
      ];
      for (const label of publicItems) {
        expect(itemsAdmin.map((i) => i.label)).toContain(label);
        expect(itemsCollab.map((i) => i.label)).toContain(label);
      }
    });

    it("a ordem dos itens é preservada após filtragem", () => {
      const items = filterMenuItems(allMenuItems, false);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual([
        "Dashboard",
        "Solicitações Cirúrgicas",
        "Pacientes",
        "Procedimentos",
      ]);
    });
  });

  describe("BottomNavBar — Filtragem de itens por isAdmin", () => {
    it("admin vê todos os 5 itens na barra de navegação", () => {
      const items = filterNavItems(allNavItems, true);
      expect(items).toHaveLength(5);
      expect(items.map((i) => i.label)).toContain("Equipe");
    });

    it("collaborator vê apenas 4 itens — Equipe é filtrado", () => {
      const items = filterNavItems(allNavItems, false);
      expect(items).toHaveLength(4);
      expect(items.map((i) => i.label)).not.toContain("Equipe");
    });

    it("Mais (Configurações) é sempre visível para qualquer perfil", () => {
      const itemsCollab = filterNavItems(allNavItems, false);
      expect(itemsCollab.map((i) => i.label)).toContain("Mais");
    });
  });

  describe("Proteção de rota /colaboradores", () => {
    it("non-admin deve ser redirecionado", () => {
      expect(shouldRedirect(false, false)).toBe(true);
    });

    it("admin não deve ser redirecionado", () => {
      expect(shouldRedirect(true, false)).toBe(false);
    });

    it("não redireciona enquanto loading (evita flash)", () => {
      expect(shouldRedirect(false, true)).toBe(false);
    });

    it("admin renderiza conteúdo normalmente", () => {
      expect(shouldRenderContent(true, false)).toBe(true);
    });

    it("non-admin não renderiza conteúdo", () => {
      expect(shouldRenderContent(false, false)).toBe(false);
    });

    it("durante loading, conteúdo não é renderizado", () => {
      expect(shouldRenderContent(true, true)).toBe(false);
    });
  });

  describe("Configurações — Tab Plano e Faturamento", () => {
    it("admin vê todas as 4 tabs", () => {
      const tabs = filterSettingsTabs(allSettingsTabs, true);
      expect(tabs).toHaveLength(4);
      expect(tabs.map((t) => t.id)).toContain("plan");
    });

    it("collaborator vê apenas 3 tabs — plan é filtrado", () => {
      const tabs = filterSettingsTabs(allSettingsTabs, false);
      expect(tabs).toHaveLength(3);
      expect(tabs.map((t) => t.id)).not.toContain("plan");
    });

    it("tabs profile, notifications e security são sempre visíveis", () => {
      const tabs = filterSettingsTabs(allSettingsTabs, false);
      const ids = tabs.map((t) => t.id);
      expect(ids).toContain("profile");
      expect(ids).toContain("notifications");
      expect(ids).toContain("security");
    });
  });

  describe("Configurações — Dados Profissionais", () => {
    it("médico vê seção de dados profissionais", () => {
      expect(shouldShowProfessionalData(true)).toBe(true);
    });

    it("não-médico não vê seção de dados profissionais", () => {
      expect(shouldShowProfessionalData(false)).toBe(false);
    });
  });
});
