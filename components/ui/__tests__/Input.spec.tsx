import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Input from "../Input";

describe("Input — associação do label", () => {
  it("liga o label ao input sem id vindo de fora", () => {
    render(<Input label="Nome" />);

    const campo = screen.getByLabelText("Nome");
    expect(campo.tagName).toBe("INPUT");
    expect(campo.id).not.toBe("");
  });

  it("respeita o id recebido", () => {
    render(<Input id="meu-input" label="E-mail" />);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("id", "meu-input");
  });

  it("dois inputs na mesma tela não compartilham id", () => {
    render(
      <>
        <Input label="Primeiro" />
        <Input label="Segundo" />
      </>,
    );

    expect(screen.getByLabelText("Primeiro").id).not.toBe(
      screen.getByLabelText("Segundo").id,
    );
  });

  it("label com asterisco de obrigatório continua achando o campo", () => {
    render(<Input label="Telefone" required />);

    expect(screen.getByLabelText(/Telefone/)).toBeRequired();
  });

  it("props espalhadas (estilo getFieldProps) continuam chegando ao campo, com máscara", () => {
    let recebido = "";
    const onChange = vi.fn((e: { target: { value: string } }) => {
      recebido = e.target.value;
    });
    const fieldProps = { name: "cpf", value: "", onChange };
    render(<Input label="CPF" mask="cpf" {...fieldProps} />);

    const campo = screen.getByLabelText("CPF");
    expect(campo).toHaveAttribute("name", "cpf");
    fireEvent.change(campo, { target: { value: "12345678900" } });
    expect(onChange).toHaveBeenCalled();
    expect(recebido).toBe("123.456.789-00");
  });
});
