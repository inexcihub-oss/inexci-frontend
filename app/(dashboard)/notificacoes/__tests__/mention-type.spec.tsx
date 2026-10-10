import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
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
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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

describe("Central de notificações — tipo menção", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: 1,
          user_id: 1,
          type: "mention",
          title: "Dr. Ana mencionou você",
          message: '"@Bruno confere esse laudo?"',
          read: false,
          link: "/solicitacao/abc?sidebar=atividades",
          created_at: "2026-04-16T10:00:00Z",
        },
      ],
      unreadCount: 1,
      total: 1,
    });
  });

  it("mostra o rótulo 'Menção' no badge, não a string crua do enum", async () => {
    render(<NotificacoesPage />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Ana mencionou você")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Menção", { selector: "span" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("mention")).not.toBeInTheDocument();
  });

  it("oferece 'Menção' como opção no filtro de tipo", async () => {
    render(<NotificacoesPage />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Ana mencionou você")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("option", { name: "Menção" }),
    ).toBeInTheDocument();
  });
});
