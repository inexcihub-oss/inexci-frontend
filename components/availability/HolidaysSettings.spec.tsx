import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

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

let queryClient: QueryClient;
function render(ui: ReactElement) {
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/** Promessa que o teste resolve na hora que quiser. */
function adiada<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ANO = new Date().getFullYear();

describe("HolidaysSettings (MIG-05)", () => {
  beforeEach(() => {
    queryClient = new QueryClient();
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

  it("criar, remover e importar invalidam o cache de feriados da Agenda", async () => {
    const user = userEvent.setup();
    const invalidar = vi.spyOn(queryClient, "invalidateQueries");
    render(<HolidaysSettings />);
    await screen.findByText("Natal");

    await user.click(screen.getByRole("button", { name: /Novo feriado/ }));
    await user.type(screen.getByLabelText("Nome"), "Aniversário");
    await user.type(screen.getByLabelText("Data"), `1603${ANO}`);
    await user.click(screen.getByRole("button", { name: "Salvar feriado" }));
    await waitFor(() => expect(invalidar).toHaveBeenCalledTimes(1));
    expect(invalidar).toHaveBeenLastCalledWith({
      queryKey: ["availability", "holidays"],
    });

    await user.click(screen.getByRole("button", { name: "Remover Natal" }));
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));
    await waitFor(() => expect(invalidar).toHaveBeenCalledTimes(2));

    // Importação que falha no meio também avisa (os já criados valem).
    service.createHoliday.mockRejectedValueOnce(new Error("rede"));
    await user.click(screen.getByRole("button", { name: "Importar feriados nacionais" }));
    await waitFor(() => expect(invalidar).toHaveBeenCalledTimes(3));
  });

  it("trocar de ano rápido: resposta atrasada do ano anterior é descartada", async () => {
    const user = userEvent.setup();
    const anoAtual = adiada<unknown[]>();
    const proximo = adiada<unknown[]>();
    service.getHolidays.mockImplementation((ano: number) =>
      ano === ANO ? anoAtual.promise : proximo.promise,
    );
    render(<HolidaysSettings />);
    await user.click(screen.getByRole("button", { name: "Próximo ano" }));

    proximo.resolve([
      { id: "n", name: "Do próximo", date: `${ANO + 1}-05-01`, recurring: false, blocksAgenda: true },
    ]);
    expect(await screen.findByText("Do próximo")).toBeInTheDocument();

    anoAtual.resolve([
      { id: "v", name: "Do ano velho", date: `${ANO}-05-01`, recurring: false, blocksAgenda: true },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Do ano velho")).toBeNull();
    expect(screen.getByText("Do próximo")).toBeInTheDocument();
  });

  it("erro de carga some quando a recarga seguinte dá certo", async () => {
    const user = userEvent.setup();
    service.getHolidays.mockRejectedValueOnce(new Error("rede"));
    render(<HolidaysSettings />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rede");
    await user.click(screen.getByRole("button", { name: "Próximo ano" }));
    expect(await screen.findByText("Natal")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
