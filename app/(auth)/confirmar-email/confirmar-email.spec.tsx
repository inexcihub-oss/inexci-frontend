import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ConfirmarEmailPage from "./page";

const pushMock = vi.fn();
const verifyEmailMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => "valid-token" }),
}));

// Mesmo com um usuário "ambiente" carregado, a página deve permanecer neutra.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-B", email: "outro@b.com" } }),
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
    resendEmailVerification: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

describe("ConfirmarEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sempre oferece 'Fazer login' após sucesso, ignorando a sessão ambiente", async () => {
    verifyEmailMock.mockResolvedValue({
      message: "ok",
      email: "novo@a.com",
    });

    render(<ConfirmarEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("E-mail confirmado!")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Fazer login" }),
    ).toBeInTheDocument();
    // Não deve assumir a sessão do usuário ambiente (contaminação de sessão).
    expect(
      screen.queryByRole("button", { name: "Ir para o painel" }),
    ).not.toBeInTheDocument();
  });
});
