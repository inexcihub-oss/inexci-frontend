import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  listNotificationLogs: vi.fn(),
  getNotificationLogStats: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/envios",
  useSearchParams: () => new URLSearchParams(search),
}));

import { AdminEnvios } from "./AdminEnvios";

const OWNER = "11111111-1111-4111-8111-111111111111";

const item = {
  id: "l1",
  channel: "whatsapp",
  status: "failed",
  recipient: "+55 11 9****-1234",
  template: "appointment_scheduled",
  templateLabel: "Consulta agendada",
  notificationType: "template",
  direction: "outbound",
  attempts: 2,
  error: "Número inválido",
  ownerId: OWNER,
  ownerName: "Clínica Alfa",
  createdAt: "2026-10-23T15:30:00Z",
  sentAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.listNotificationLogs.mockResolvedValue({ items: [item], total: 1 });
  svc.getNotificationLogStats.mockResolvedValue([
    { channel: "email", status: "sent", count: 5 },
    { channel: "email", status: "failed", count: 2 },
    { channel: "whatsapp", status: "delivered", count: 3 },
  ]);
});

function mockMobile() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 639px)",
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminEnvios", () => {
  it("mostra cartões por canal e situação e a tabela com destinatário mascarado e nome da conta", async () => {
    renderWithProviders(<AdminEnvios />);

    const email = await screen.findByTestId("envios-card-email");
    await waitFor(() =>
      expect(within(email).getByText("7")).toBeInTheDocument(),
    );
    expect(within(email).getByText("Enviado").parentElement).toHaveTextContent(
      /Enviado\s*5/,
    );
    expect(
      within(screen.getByTestId("envios-card-whatsapp")).getByText("Entregue")
        .parentElement,
    ).toHaveTextContent(/Entregue\s*3/);

    expect(await screen.findByText("+55 11 9****-1234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clínica Alfa" })).toHaveAttribute(
      "href",
      `/admin/clientes/${OWNER}`,
    );
    expect(screen.getByText("23/10/2026 12:30")).toBeInTheDocument();
    expect(screen.getByText("Número inválido")).toBeInTheDocument();
    expect(screen.getByText("Consulta agendada")).toHaveAttribute(
      "title",
      "appointment_scheduled",
    );
    expect(screen.queryByText("appointment_scheduled")).toBeNull();
  });

  it("filtros da URL vão para a API, com período no fuso de São Paulo", async () => {
    search = `canal=whatsapp&situacao=failed&conta=${OWNER}&de=2026-10-01&ate=2026-10-02`;
    renderWithProviders(<AdminEnvios />);

    await waitFor(() =>
      expect(svc.listNotificationLogs).toHaveBeenCalledWith({
        channel: "whatsapp",
        status: "failed",
        ownerId: OWNER,
        from: "2026-10-01T00:00:00-03:00",
        to: "2026-10-03T00:00:00-03:00",
        limit: 25,
        offset: 0,
      }),
    );
    expect(svc.getNotificationLogStats).toHaveBeenCalledWith({
      channel: "whatsapp",
      ownerId: OWNER,
      from: "2026-10-01T00:00:00-03:00",
      to: "2026-10-03T00:00:00-03:00",
    });
  });

  it("id de conta parcial não vai para a URL nem para a API; completo vai", async () => {
    renderWithProviders(<AdminEnvios />);
    const campo = screen.getByLabelText("Conta (id)");

    fireEvent.change(campo, { target: { value: "1111-22" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe o id completo da conta.",
    );
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: OWNER } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith(`/admin/envios?conta=${OWNER}`, {
      scroll: false,
    });
  });

  it("conta inválida na URL é ignorada", async () => {
    search = "conta=abc&canal=sms&situacao=xyz";
    renderWithProviders(<AdminEnvios />);

    await waitFor(() =>
      expect(svc.listNotificationLogs).toHaveBeenCalledWith({
        channel: undefined,
        status: undefined,
        ownerId: undefined,
        from: undefined,
        to: undefined,
        limit: 25,
        offset: 0,
      }),
    );
  });

  it("mudar o canal atualiza a query string e a paginação avança", async () => {
    svc.listNotificationLogs.mockResolvedValue({ items: [item], total: 60 });
    search = "pagina=2";
    renderWithProviders(<AdminEnvios />);

    await waitFor(() =>
      expect(svc.listNotificationLogs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 25 }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Canal"), {
      target: { value: "email" },
    });
    expect(replace).toHaveBeenCalledWith("/admin/envios?canal=email", {
      scroll: false,
    });
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    expect(replace).toHaveBeenCalledWith("/admin/envios?pagina=3", {
      scroll: false,
    });
  });

  it("sem resultados mostra o estado vazio", async () => {
    svc.listNotificationLogs.mockResolvedValue({ items: [], total: 0 });
    renderWithProviders(<AdminEnvios />);
    expect(
      await screen.findByText("Nenhum envio encontrado"),
    ).toBeInTheDocument();
  });

  it("no celular os filtros ficam no botão Filtros e cada envio vira um card", async () => {
    mockMobile();
    search = "canal=email";
    renderWithProviders(<AdminEnvios />);

    const card = (await screen.findByText("+55 11 9****-1234")).closest("li");
    expect(card).toHaveTextContent("Clínica Alfa");
    expect(card).toHaveTextContent("Número inválido");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Canal")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Canal")).toHaveValue("email");
    expect(within(dialog).getByLabelText("De")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Até")).toBeInTheDocument();
  });
});
