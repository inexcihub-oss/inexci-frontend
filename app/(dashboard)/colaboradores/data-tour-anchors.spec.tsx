import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ColaboradoresPage from "./page";

/**
 * Prova que a tela real de colaboradores carrega a âncora `data-tour` que o
 * tour de onboarding (`lib/onboarding/tour-registry.ts`, trilha
 * `administracao`) espera encontrar — "admin-novo-colaborador". Sem este
 * teste, remover o atributo (ou trocar o elemento) quebra o tour em
 * silêncio: `useTargetRect` só reporta "ausente" e o passo é pulado, sem
 * nenhum erro visível em dev.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

describe("Tela de Colaboradores — âncoras do tour", () => {
  it('expõe data-tour="admin-novo-colaborador" no botão de novo colaborador', async () => {
    render(<ColaboradoresPage />);

    const botao = await screen.findByText("Novo colaborador");
    expect(botao.closest('[data-tour="admin-novo-colaborador"]')).not.toBeNull();
  });
});
