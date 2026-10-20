import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpInput } from "../OtpInput";

function OtpControlado({ onComplete }: { onComplete?: (v: string) => void }) {
  const [valor, setValor] = useState("");
  return (
    <>
      <OtpInput
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onComplete={onComplete}
      />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

function digito(n: number) {
  return screen.getByLabelText(`Dígito ${n} de 6`);
}

function errosDeSetStateNoRender(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((args: unknown[]) =>
    args.some(
      (a: unknown) =>
        typeof a === "string" && a.includes("Cannot update a component"),
    ),
  );
}

describe("OtpInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("digitar atualiza o pai sem setState durante a renderização", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpControlado onComplete={onComplete} />);

    await user.click(digito(1));
    await user.keyboard("123456");

    expect(screen.getByTestId("valor")).toHaveTextContent("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(errosDeSetStateNoRender(consoleError)).toEqual([]);
  });

  it("backspace apaga o dígito atual e depois o anterior", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<OtpControlado />);

    await user.click(digito(1));
    await user.keyboard("12");
    expect(screen.getByTestId("valor")).toHaveTextContent("12");

    await user.click(digito(3));
    await user.keyboard("{Backspace}");
    expect(screen.getByTestId("valor")).toHaveTextContent(/^1$/);
    expect(digito(2)).toHaveFocus();

    await user.keyboard("{Backspace}");
    expect(screen.getByTestId("valor")).toHaveTextContent(/^$/);
    expect(errosDeSetStateNoRender(consoleError)).toEqual([]);
  });

  it("colar preenche todos os dígitos e ignora o que não é número", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onComplete = vi.fn();
    render(<OtpControlado onComplete={onComplete} />);

    fireEvent.paste(digito(1), {
      clipboardData: { getData: () => "12 34-56" },
    });

    expect(screen.getByTestId("valor")).toHaveTextContent("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(errosDeSetStateNoRender(consoleError)).toEqual([]);
  });
});
