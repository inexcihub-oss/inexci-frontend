import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const service = vi.hoisted(() => ({
  getHolidays: vi.fn(),
  createHoliday: vi.fn(),
  updateHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
}));
vi.mock("@/services/availability.service", () => ({
  availabilityService: service,
}));

import { HolidaysSettings } from "./HolidaysSettings";

const ANO = new Date().getFullYear();

describe("HolidaysSettings (MIG-05)", () => {
  beforeEach(() => {
    Object.values(service).forEach((f) => f.mockReset());
    service.getHolidays.mockResolvedValue([
      { id: "h1", name: "Natal", date: "2020-12-25", recurring: true, blocksAgenda: true },
      { id: "h2", name: "Carnaval", date: `${ANO}-02-17`, recurring: false, blocksAgenda: false },
    ]);
    service.createHoliday.mockResolvedValue({});
    service.updateHoliday.mockResolvedValue({});
    service.deleteHoliday.mockResolvedValue(undefined);
  });

  it("lista os feriados do ano em ordem de dia/mês, com recorrência e bloqueio", async () => {
    render(<HolidaysSettings />);
    const itens = await screen.findAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Carnaval");
    expect(itens[0]).toHaveTextContent("não bloqueia");
    expect(itens[1]).toHaveTextContent("25/12");
    expect(itens[1]).toHaveTextContent("todo ano");
    expect(service.getHolidays).toHaveBeenCalledWith(ANO);
  });

  it("troca o ano", async () => {
    const user = userEvent.setup();
    render(<HolidaysSettings />);
    await screen.findByText("Natal");
    await user.click(screen.getByRole("button", { name: "Próximo ano" }));
    await waitFor(() => expect(service.getHolidays).toHaveBeenLastCalledWith(ANO + 1));
  });

  it("cria um feriado", async () => {
    const user = userEvent.setup();
    render(<HolidaysSettings />);
    await screen.findByText("Natal");
    await user.click(screen.getByRole("button", { name: /Novo feriado/ }));
    await user.type(screen.getByLabelText("Nome"), "Aniversário da cidade");
    await user.type(screen.getByLabelText("Data"), `1603${ANO}`);
    await user.click(screen.getByLabelText("Repete todo ano"));
    await user.click(screen.getByRole("button", { name: "Salvar feriado" }));
    await waitFor(() =>
      expect(service.createHoliday).toHaveBeenCalledWith({
        name: "Aniversário da cidade",
        date: `${ANO}-03-16`,
        recurring: true,
        blocksAgenda: true,
      }),
    );
  });

  it("importar nacionais cria só os que faltam, recorrentes e bloqueando", async () => {
    const user = userEvent.setup();
    render(<HolidaysSettings />);
    await screen.findByText("Natal");
    await user.click(screen.getByRole("button", { name: "Importar feriados nacionais" }));
    await waitFor(() => expect(service.createHoliday).toHaveBeenCalledTimes(8));
    const datas = service.createHoliday.mock.calls.map((c) => c[0].date);
    expect(datas).not.toContain(`${ANO}-12-25`);
    expect(service.createHoliday.mock.calls[0][0]).toMatchObject({
      recurring: true,
      blocksAgenda: true,
    });
  });

  it("não salva sem nome ou data; remove depois de confirmar", async () => {
    const user = userEvent.setup();
    render(<HolidaysSettings />);
    await screen.findByText("Natal");
    await user.click(screen.getByRole("button", { name: /Novo feriado/ }));
    await user.click(screen.getByRole("button", { name: "Salvar feriado" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe o nome e a data do feriado.");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getByRole("button", { name: "Remover Natal" }));
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));
    await waitFor(() => expect(service.deleteHoliday).toHaveBeenCalledWith("h1"));
  });
});
