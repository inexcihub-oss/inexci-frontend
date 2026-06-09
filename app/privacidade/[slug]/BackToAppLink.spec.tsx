import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BackToAppLink } from "./BackToAppLink";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("BackToAppLink", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("aponta para /login quando não há sessão local", async () => {
    render(<BackToAppLink />);
    await waitFor(() => {
      expect(screen.getByText("Voltar para o app")).toHaveAttribute(
        "href",
        "/login",
      );
    });
  });

  it("aponta para /dashboard quando há usuário salvo no localStorage", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "user-1", email: "a@b.com" }),
    );
    render(<BackToAppLink />);
    await waitFor(() => {
      expect(screen.getByText("Voltar para o app")).toHaveAttribute(
        "href",
        "/dashboard",
      );
    });
  });

  it("mantém /login quando o dado salvo está corrompido", async () => {
    localStorage.setItem("user", "{not-json");
    render(<BackToAppLink />);
    await waitFor(() => {
      expect(screen.getByText("Voltar para o app")).toHaveAttribute(
        "href",
        "/login",
      );
    });
  });
});
