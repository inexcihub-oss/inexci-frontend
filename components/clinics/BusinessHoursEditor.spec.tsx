import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { normalizeBusinessHours } from "@/lib/business-hours";
import {
  BusinessHoursEditor,
  validarGrade,
} from "./BusinessHoursEditor";

const grade = normalizeBusinessHours({
  mon: [{ start: "08:00", end: "12:00" }],
});

describe("validarGrade", () => {
  it("não acusa erro em grade válida", () => {
    expect(validarGrade(grade)).toEqual({});
  });

  it("acusa bloco com início maior ou igual ao fim", () => {
    const invalida = normalizeBusinessHours({
      mon: [{ start: "18:00", end: "09:00" }],
    });
    expect(validarGrade(invalida).mon).toBe(
      "O horário inicial deve ser menor que o final.",
    );
  });

  it("acusa blocos sobrepostos", () => {
    const invalida = normalizeBusinessHours({
      mon: [
        { start: "08:00", end: "12:00" },
        { start: "11:00", end: "15:00" },
      ],
    });
    expect(validarGrade(invalida).mon).toBe(
      "Há blocos de horário sobrepostos neste dia.",
    );
  });

  /**
   * I3: `<input type="time">` devolve "" quando o usuário limpa o campo.
   * `toMinutes("")` é NaN, e nem `NaN >= NaN` nem `NaN < NaN` disparam as
   * regras de ordem/sobreposição — o campo vazio passava pelo portão.
   */
  it("acusa hora em branco antes de comparar início e fim", () => {
    const invalida = normalizeBusinessHours({
      mon: [{ start: "", end: "12:00" }],
    });
    expect(validarGrade(invalida).mon).toBe(
      "Preencha o horário no formato HH:mm.",
    );
  });
});

describe("BusinessHoursEditor", () => {
  it("mostra um dia aberto com seu bloco e os demais como fechados", () => {
    render(<BusinessHoursEditor value={grade} onChange={vi.fn()} />);

    const segunda = screen.getByTestId("dia-mon");
    expect(within(segunda).getByDisplayValue("08:00")).toBeInTheDocument();
    expect(within(segunda).getByDisplayValue("12:00")).toBeInTheDocument();

    const domingo = screen.getByTestId("dia-sun");
    expect(within(domingo).getByText("Fechado")).toBeInTheDocument();
  });

  it("abre um dia fechado criando o primeiro bloco 08:00–18:00", () => {
    const onChange = vi.fn();
    render(<BusinessHoursEditor value={grade} onChange={onChange} />);

    fireEvent.click(
      within(screen.getByTestId("dia-tue")).getByRole("switch"),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tue: [{ start: "08:00", end: "18:00" }],
      }),
    );
  });

  it("fecha um dia removendo todos os blocos", () => {
    const onChange = vi.fn();
    render(<BusinessHoursEditor value={grade} onChange={onChange} />);

    fireEvent.click(
      within(screen.getByTestId("dia-mon")).getByRole("switch"),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mon: [] }),
    );
  });

  /**
   * Minor: o bloco novo nasce a partir do fim do último bloco existente
   * (aqui, 12:00), não mais fixo em 08:00–18:00 — que nasceria sobreposto
   * com o bloco 08:00–12:00 já existente e a linha apareceria em vermelho
   * antes de o usuário sequer digitar.
   */
  it("acrescenta um segundo bloco no dia, a partir do fim do último", () => {
    const onChange = vi.fn();
    render(<BusinessHoursEditor value={grade} onChange={onChange} />);

    fireEvent.click(
      within(screen.getByTestId("dia-mon")).getByRole("button", {
        name: /adicionar bloco/i,
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mon: [
          { start: "08:00", end: "12:00" },
          { start: "12:00", end: "13:00" },
        ],
      }),
    );
  });

  it("remove um bloco", () => {
    const doisBlocos = normalizeBusinessHours({
      mon: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
    });
    const onChange = vi.fn();
    render(<BusinessHoursEditor value={doisBlocos} onChange={onChange} />);

    fireEvent.click(
      within(screen.getByTestId("dia-mon")).getAllByRole("button", {
        name: /remover bloco/i,
      })[0],
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mon: [{ start: "14:00", end: "18:00" }],
      }),
    );
  });

  it("edita a hora de um bloco", () => {
    const onChange = vi.fn();
    render(<BusinessHoursEditor value={grade} onChange={onChange} />);

    fireEvent.change(
      within(screen.getByTestId("dia-mon")).getByDisplayValue("08:00"),
      { target: { value: "09:00" } },
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mon: [{ start: "09:00", end: "12:00" }],
      }),
    );
  });

  it("mostra o erro de sobreposição no dia", () => {
    const invalida = normalizeBusinessHours({
      mon: [
        { start: "08:00", end: "12:00" },
        { start: "11:00", end: "15:00" },
      ],
    });
    render(<BusinessHoursEditor value={invalida} onChange={vi.fn()} />);

    expect(
      screen.getByText("Há blocos de horário sobrepostos neste dia."),
    ).toBeInTheDocument();
  });

  it("esconde o botão de adicionar quando o dia atinge o teto de blocos", () => {
    const cheio = normalizeBusinessHours({
      mon: [
        { start: "07:00", end: "08:00" },
        { start: "09:00", end: "10:00" },
        { start: "11:00", end: "12:00" },
        { start: "13:00", end: "14:00" },
      ],
    });
    render(<BusinessHoursEditor value={cheio} onChange={vi.fn()} />);

    expect(
      within(screen.getByTestId("dia-mon")).queryByRole("button", {
        name: /adicionar bloco/i,
      }),
    ).not.toBeInTheDocument();
  });
});
