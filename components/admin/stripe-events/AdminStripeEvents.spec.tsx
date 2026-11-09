import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  listStripeEvents: vi.fn(),
  reprocessStripeEvent: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/stripe",
  useSearchParams: () => new URLSearchParams(search),
}));

import {
  AdminStripeEvents,
  STRIPE_EVENTS_PAGE_SIZE,
} from "./AdminStripeEvents";
import { AccountStripeEventsSection } from "./AccountStripeEventsSection";

const event = (over: Record<string, unknown> = {}) => ({
  id: "e-1",
  eventId: "evt_123",
  eventType: "invoice.paid",
  gatewayType: "invoice.paid",
  label: "Fatura paga",
  situation: "failed",
  stale: false,
  createdAt: "2026-10-28T10:00:00Z",
  processedAt: null,
  error: "Assinatura *** não encontrada",
  ownerId: "o-1",
  ownerName: "Clínica Alfa",
  customerId: "cus_1",
  subscriptionRef: null,
  warning:
    "A plataforma não identificou a assinatura neste evento, então o status da assinatura não foi atualizado por ele.",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.listStripeEvents.mockResolvedValue({
    items: [
      event(),
      event({
        id: "e-2",
        situation: "processed",
        processedAt: "2026-10-28T10:00:02Z",
        error: null,
        warning: null,
        label: "Assinatura atualizada",
      }),
    ],
    total: 2,
    counts: { failed: 1, stalePending: 4 },
  });
  svc.reprocessStripeEvent.mockResolvedValue({
    auditLogId: "a",
    id: "e-1",
    processedAt: "2026-10-28T12:00:00Z",
  });
});

describe("AdminStripeEvents", () => {
  it("abre em 'Com problema', com contadores, erro, aviso da assinatura e link da conta", async () => {
    renderWithProviders(<AdminStripeEvents />);

    expect(
      await screen.findByText("Pendentes há mais de 1 h"),
    ).toBeInTheDocument();
    expect(svc.listStripeEvents).toHaveBeenCalledWith({
      problems: true,
      limit: STRIPE_EVENTS_PAGE_SIZE,
      offset: 0,
    });
    const lista = screen.getByRole("region", { name: "Eventos com problema" });
    expect(lista).toHaveTextContent("Assinatura *** não encontrada");
    expect(lista).toHaveTextContent(
      "A plataforma não identificou a assinatura neste evento",
    );
    expect(
      within(lista).getAllByRole("link", { name: "Clínica Alfa" })[0],
    ).toHaveAttribute("href", "/admin/clientes/o-1?tab=assinatura");
    expect(
      within(lista).getAllByRole("button", { name: /Reprocessar/ }),
    ).toHaveLength(1);
  });

  it("trocar para 'Todos' atualiza a URL", async () => {
    renderWithProviders(<AdminStripeEvents />);
    fireEvent.click(await screen.findByRole("button", { name: "Todos" }));
    expect(replace).toHaveBeenCalledWith("/admin/stripe?ver=todos", {
      scroll: false,
    });
  });

  it("'Todos' na URL não filtra problemas", async () => {
    search = "ver=todos";
    renderWithProviders(<AdminStripeEvents />);
    await waitFor(() =>
      expect(svc.listStripeEvents).toHaveBeenCalledWith({
        limit: STRIPE_EVENTS_PAGE_SIZE,
        offset: 0,
      }),
    );
  });

  it("reprocessar pede motivo e chama a API", async () => {
    renderWithProviders(<AdminStripeEvents />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Reprocessar Fatura paga/ }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Stripe voltou ao normal" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Reprocessar" }),
    );
    await waitFor(() =>
      expect(svc.reprocessStripeEvent).toHaveBeenCalledWith(
        "e-1",
        "Stripe voltou ao normal",
      ),
    );
  });
});

describe("AccountStripeEventsSection", () => {
  it("busca só os eventos da conta e não repete o nome dela", async () => {
    renderWithProviders(<AccountStripeEventsSection ownerId="o-1" />);
    expect(
      await screen.findByText("Assinatura atualizada"),
    ).toBeInTheDocument();
    expect(svc.listStripeEvents).toHaveBeenCalledWith({
      ownerId: "o-1",
      limit: 10,
      offset: 0,
    });
    expect(screen.queryByRole("link", { name: "Clínica Alfa" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/admin/stripe",
    );
  });

  it("conta sem eventos mostra o estado vazio", async () => {
    svc.listStripeEvents.mockResolvedValue({
      items: [],
      total: 0,
      counts: { failed: 0, stalePending: 0 },
    });
    renderWithProviders(<AccountStripeEventsSection ownerId="o-1" />);
    expect(
      await screen.findByText("Nenhum evento da Stripe"),
    ).toBeInTheDocument();
  });
});
