import { describe, it, expect, vi } from "vitest";
import {
  render as rtlRender,
  type RenderOptions,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

import { CollaboratorActionsSection } from "../CollaboratorActionsSection";
import { collaboratorService } from "@/services/collaborator.service";

function render(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    toggleStatus: vi.fn(),
    resendInvite: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe("CollaboratorActionsSection — âncora do tour", () => {
  it('expõe data-tour="colaborador-ciclo-status"', () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="col-1"
        currentStatus="active"
      />,
    );

    expect(
      document.querySelector('[data-tour="colaborador-ciclo-status"]'),
    ).not.toBeNull();
  });

  it("trava o toggle de status para o colaborador fabricado do tour", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("handleToggleStatus não chama collaboratorService.toggleStatus para o colaborador fabricado, mesmo com o switch nativamente habilitado", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    const switchEl = screen.getByRole("switch") as HTMLButtonElement;
    switchEl.disabled = false;
    fireEvent.click(switchEl);

    expect(collaboratorService.toggleStatus).not.toHaveBeenCalled();
  });

  it("handleResetPassword não chama collaboratorService.resetPassword para o colaborador fabricado, mesmo com o botão nativamente habilitado", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), {
      target: { value: "senha123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repita a nova senha"), {
      target: { value: "senha123" },
    });

    const saveButton = screen.getByRole("button", {
      name: "Salvar nova senha",
    }) as HTMLButtonElement;
    saveButton.disabled = false;
    fireEvent.click(saveButton);

    expect(collaboratorService.resetPassword).not.toHaveBeenCalled();
  });
});

describe("CollaboratorActionsSection — lista de médicos em cache", () => {
  it("ativar/desativar invalida a lista de médicos (wizard de SC, agenda)", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(collaboratorService.toggleStatus).mockResolvedValue({
      status: "inactive",
    } as Awaited<ReturnType<typeof collaboratorService.toggleStatus>>);

    render(
      <CollaboratorActionsSection collaboratorId="col-1" currentStatus="active" />,
    );
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["available-doctors"],
      }),
    );
    invalidate.mockRestore();
  });
});
