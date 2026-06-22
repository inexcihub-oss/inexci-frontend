import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const loginMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    loading: false,
    isAuthenticated: false,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue(undefined);
    window.history.replaceState({}, "", "/login");
  });

  it("envia credenciais via handler sem navegação GET na URL", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrar/i })).not.toBeDisabled();
    });

    await user.type(screen.getByLabelText(/e-mail/i), "medico@inexci.com");
    await user.type(screen.getByLabelText(/^senha/i), "Teste123@");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        "medico@inexci.com",
        "Teste123@",
      );
    });
    expect(window.location.search).toBe("");
  });
});
