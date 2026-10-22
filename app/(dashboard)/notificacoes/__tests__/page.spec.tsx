import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as rtlRender,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("date-fns", () => ({ formatDistanceToNow: () => "há 2 minutos" }));
vi.mock("date-fns/locale", () => ({ ptBR: {} }));

const mockGetNotifications = vi.fn();

vi.mock("@/services/notification.service", () => ({
  notificationService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

import NotificacoesPage from "../page";

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe("Central de notificações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: "a",
          type: "status_update",
          title: "Status alterado",
          message: "Mudou para Em Análise",
          read: false,
          link: "/solicitacoes-cirurgicas/1",
          createdAt: now.toISOString(),
        },
        {
          id: "b",
          type: "system",
          title: "⚠️ Solicitação Parada — Ação Imediata",
          message: "Parada há 49 dias",
          read: false,
          link: "/solicitacao/2",
          metadata: { staleDays: 49, severity: "critical" },
          createdAt: daysAgo(14),
        },
      ],
      unreadCount: 2,
      total: 2,
    });
  });

  it("mostra ícone e rótulo de solicitação parada para o tipo system", async () => {
    const { container } = render(<NotificacoesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Solicitação Parada — Ação Imediata"),
      ).toBeInTheDocument();
    });

    expect(
      container.querySelector('[data-notification-kind="stale_critical"]'),
    ).not.toBeNull();
    expect(screen.getAllByText("Ação imediata").length).toBeGreaterThan(0);
    expect(screen.queryByText("system")).not.toBeInTheDocument();
  });

  it("agrupa por período", async () => {
    render(<NotificacoesPage />);

    const hoje = await screen.findByRole("region", { name: "Hoje" });
    expect(within(hoje).getByText("Status alterado")).toBeInTheDocument();
    const antigas = screen.getByRole("region", { name: "Últimos 30 dias" });
    expect(
      within(antigas).getByText("Solicitação Parada — Ação Imediata"),
    ).toBeInTheDocument();
  });

  it("normaliza o link legado da solicitação", async () => {
    render(<NotificacoesPage />);

    const title = await screen.findByText("Status alterado");
    expect(title.closest("a")).toHaveAttribute("href", "/solicitacao/1");
  });

  it("filtra por solicitação parada", async () => {
    render(<NotificacoesPage />);
    await screen.findByText("Status alterado");

    fireEvent.change(screen.getByLabelText("Filtrar por tipo"), {
      target: { value: "stale" },
    });

    expect(screen.queryByText("Status alterado")).not.toBeInTheDocument();
    expect(
      screen.getByText("Solicitação Parada — Ação Imediata"),
    ).toBeInTheDocument();
  });

  it("alterna para não lidas pelo controle segmentado", async () => {
    render(<NotificacoesPage />);
    await screen.findByText("Status alterado");

    const naoLidas = screen.getByRole("button", { name: "Não lidas" });
    fireEvent.click(naoLidas);

    expect(naoLidas).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ unreadOnly: true }),
      );
    });
  });

  it("usa o select do design system", async () => {
    render(<NotificacoesPage />);
    await screen.findByText("Status alterado");

    expect(screen.getByLabelText("Filtrar por tipo")).toHaveClass("ds-input");
  });
});
