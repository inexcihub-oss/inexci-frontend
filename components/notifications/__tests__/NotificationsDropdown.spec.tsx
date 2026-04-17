import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationsDropdown from "../NotificationsDropdown";

// Mock next/link
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

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "há 2 minutos",
}));
vi.mock("date-fns/locale", () => ({
  ptBR: {},
}));

const mockGetUnreadCount = vi.fn();
const mockGetNotifications = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();

vi.mock("@/services/notification.service", () => ({
  notificationService: {
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
    deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
  },
}));

const mockNotifications = [
  {
    id: 1,
    user_id: 1,
    type: "status_update",
    title: "Status alterado",
    message: "Solicitação SC-000001 mudou para Em Análise",
    read: false,
    link: "/solicitacoes-cirurgicas/1",
    created_at: "2026-04-16T10:00:00Z",
  },
  {
    id: 2,
    user_id: 1,
    type: "stale",
    title: "Solicitação parada",
    message: "SC-000002 está parada há 7 dias",
    read: true,
    link: "/solicitacoes-cirurgicas/2",
    created_at: "2026-04-15T08:00:00Z",
  },
  {
    id: 3,
    user_id: 1,
    type: "action_by_user",
    title: "Ação de usuário",
    message: "Dr. Silva enviou solicitação",
    read: false,
    link: null,
    created_at: "2026-04-14T14:00:00Z",
  },
];

describe("NotificationsDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUnreadCount.mockResolvedValue(2);
    mockGetNotifications.mockResolvedValue({
      notifications: mockNotifications,
      unreadCount: 2,
      total: 3,
    });
    mockMarkAsRead.mockResolvedValue(undefined);
    mockMarkAllAsRead.mockResolvedValue(undefined);
    mockDeleteNotification.mockResolvedValue(undefined);
  });

  it("renderiza o badge com contagem de não lidas", async () => {
    render(<NotificationsDropdown />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("não renderiza badge quando não há notificações", async () => {
    mockGetUnreadCount.mockResolvedValue(0);
    render(<NotificationsDropdown />);
    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalled();
    });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("abre dropdown ao clicar e carrega notificações", async () => {
    render(<NotificationsDropdown />);
    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalled();
    });

    const bellButton = screen.getByText("Notificações");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith({ take: 10 });
    });

    expect(screen.getByText("Status alterado")).toBeInTheDocument();
    expect(screen.getByText("Solicitação parada")).toBeInTheDocument();
    expect(screen.getByText("Ação de usuário")).toBeInTheDocument();
  });

  it("mostra ícone correto por tipo de notificação", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      expect(screen.getByText("📋")).toBeInTheDocument(); // status_update
      expect(screen.getByText("⏰")).toBeInTheDocument(); // stale
      expect(screen.getByText("👤")).toBeInTheDocument(); // action_by_user
    });
  });

  it("marca notificação como lida ao clicar", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      expect(screen.getByText("Status alterado")).toBeInTheDocument();
    });

    // Click the link of the first unread notification
    const link = screen.getByText("Status alterado");
    fireEvent.click(link);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
    });
  });

  it("marca todas como lidas", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      expect(screen.getByText("Marcar todas como lidas")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Marcar todas como lidas"));

    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });

  it("remove notificação", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      expect(screen.getByText("Status alterado")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle("Remover");
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockDeleteNotification).toHaveBeenCalledWith(1);
    });
  });

  it("mostra link para página de notificações no footer", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      const link = screen.getByText("Ver todas as notificações");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "/notificacoes");
    });
  });

  it("mostra link para configurações no footer", async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      const link = screen.getByText("Configurações");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "/configuracoes");
    });
  });

  it("mostra estado vazio quando não há notificações", async () => {
    mockGetNotifications.mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      total: 0,
    });
    mockGetUnreadCount.mockResolvedValue(0);

    render(<NotificationsDropdown />);
    fireEvent.click(screen.getByText("Notificações"));

    await waitFor(() => {
      expect(screen.getByText("Nenhuma notificação")).toBeInTheDocument();
    });
  });

  it("renderiza corretamente quando isCollapsed=true", async () => {
    render(<NotificationsDropdown isCollapsed={true} />);
    // Should not show text label when collapsed
    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalled();
    });
    // The text "Notificações" should not be visible
    expect(screen.queryByText("Notificações")).not.toBeInTheDocument();
  });
});
