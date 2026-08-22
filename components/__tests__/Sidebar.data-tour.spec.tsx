import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

/**
 * Prova que a Sidebar carrega a âncora `data-tour` que a trilha `cadastros`
 * (`lib/onboarding/tour-registry.ts`) espera encontrar — "cadastros-menu",
 * no botão que alterna o acordeão "Cadastros". Sem este teste, remover o
 * atributo (ou trocar o elemento) quebra o tour em silêncio.
 */

const authState = {
  user: { id: "u-1", name: "Ana", role: "collaborator" },
  permissions: [Permission.ADMINISTRACAO] as Permission[],
  can: (p: Permission) => authState.permissions.includes(p),
  isAdmin: false,
  isDoctor: false,
  logout: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agenda",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/notifications/NotificationsDropdown", () => ({
  default: () => null,
}));

import Sidebar from "@/components/Sidebar";

describe("Sidebar — âncora do tour", () => {
  it('expõe data-tour="cadastros-menu" no botão que abre o acordeão Cadastros', () => {
    render(<Sidebar />);

    const botao = screen.getByText("Cadastros");
    expect(botao.closest('[data-tour="cadastros-menu"]')).not.toBeNull();
  });
});
