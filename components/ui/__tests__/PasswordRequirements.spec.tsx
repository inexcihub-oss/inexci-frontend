import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordRequirements } from "@/components/ui/PasswordRequirements";

function getStatus(key: string): string | null {
  const li = document.querySelector(`[data-key="${key}"]`);
  return li?.getAttribute("data-ok");
}

describe("PasswordRequirements", () => {
  it("renderiza os 5 requisitos", () => {
    render(<PasswordRequirements password="" />);
    const list = screen.getByTestId("password-requirements");
    expect(list.querySelectorAll("li").length).toBe(5);
  });

  it("marca todos como falsos quando senha vazia", () => {
    render(<PasswordRequirements password="" />);
    expect(getStatus("minLength")).toBe("false");
    expect(getStatus("hasUpper")).toBe("false");
    expect(getStatus("hasLower")).toBe("false");
    expect(getStatus("hasNumber")).toBe("false");
    expect(getStatus("hasSpecial")).toBe("false");
  });

  it("marca todos como ok quando senha forte", () => {
    render(<PasswordRequirements password="Senha@123" />);
    expect(getStatus("minLength")).toBe("true");
    expect(getStatus("hasUpper")).toBe("true");
    expect(getStatus("hasLower")).toBe("true");
    expect(getStatus("hasNumber")).toBe("true");
    expect(getStatus("hasSpecial")).toBe("true");
  });

  it("marca apenas os requisitos atendidos parcialmente", () => {
    render(<PasswordRequirements password="senha123" />);
    expect(getStatus("minLength")).toBe("true");
    expect(getStatus("hasLower")).toBe("true");
    expect(getStatus("hasNumber")).toBe("true");
    expect(getStatus("hasUpper")).toBe("false");
    expect(getStatus("hasSpecial")).toBe("false");
  });

  it("exibe os textos dos requisitos", () => {
    render(<PasswordRequirements password="" />);
    expect(screen.getByText(/Pelo menos 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/letra maiúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/letra minúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/1 número/i)).toBeInTheDocument();
    expect(screen.getByText(/caractere especial/i)).toBeInTheDocument();
  });
});
