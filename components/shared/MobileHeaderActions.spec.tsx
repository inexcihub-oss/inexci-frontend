import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MobileHeaderActions from "./MobileHeaderActions";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/atendimento",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("date-fns", () => ({ formatDistanceToNow: () => "há 14 dias" }));
vi.mock("date-fns/locale", () => ({ ptBR: {} }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Dr. Carlos Mendes", email: "c@x.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserAvatarUrl", () => ({ useUserAvatarUrl: () => null }));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ unreadCount: 1, setUnreadCount: vi.fn() }),
}));

const mockGetNotifications = vi.fn();

vi.mock("@/services/notification.service", () => ({
  notificationService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

describe("MobileHeaderActions — notificações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: "1",
          type: "system",
          title: "Solicitação Parada",
          message: "A solicitação do paciente Ana está há 14 dias",
          read: false,
          link: "/solicitacao/1",
          metadata: { staleDays: 14, severity: "warning" },
          createdAt: "2026-10-08T10:00:00Z",
        },
      ],
      unreadCount: 1,
      total: 1,
    });
  });

  it("usa o mesmo painel do desktop, com título e ícone do tipo", async () => {
    const { container } = render(<MobileHeaderActions />);
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));

    await waitFor(() => {
      expect(screen.getByText("Solicitação Parada")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("dialog", { name: "Notificações" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-notification-kind="stale"]'),
    ).not.toBeNull();
    expect(screen.queryByText("ℹ️")).not.toBeInTheDocument();
    expect(screen.getByText("Ver todas as notificações")).toBeInTheDocument();
  });
});
