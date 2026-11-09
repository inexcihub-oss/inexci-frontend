import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const replace = vi.fn();
let tabParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/faturamento",
  useSearchParams: () => new URLSearchParams(tabParam ? `tab=${tabParam}` : ""),
}));

const svc = vi.hoisted(() => ({
  getRevenueSummary: vi.fn(),
  getRevenueForecast: vi.fn(),
  listInvoices: vi.fn(),
  getDelinquency: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminBilling } from "./AdminBilling";

const invoice = (over: Record<string, unknown> = {}) => ({
  id: "i-1",
  gatewayInvoiceId: "in_1",
  ownerId: "o-1",
  ownerName: "Clínica Ortho",
  ownerEmail: "a@ortho.com",
  status: "paid",
  amountDueCents: 9900,
  amountPaidCents: 9900,
  amountRemainingCents: 0,
  amountDiscountCents: 1000,
  currency: "brl",
  couponCode: "BEMVINDO",
  dueDate: null,
  paidAt: "2026-10-05T12:00:00Z",
  periodStart: null,
  periodEnd: null,
  invoiceCreatedAt: "2026-10-05T12:00:00Z",
  hostedInvoiceUrl: "https://invoice.stripe.com/i/1",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  tabParam = null;
  svc.getRevenueSummary.mockResolvedValue({
    month: "2026-10",
    receivedCents: 123456,
    receivedInvoices: 7,
    discountsCents: 0,
    openCents: 5000,
    openInvoices: 2,
    delinquentCents: 0,
    delinquentAccounts: 0,
    mrrCents: 300000,
    arrCents: 3600000,
    payingAccounts: 12,
    averageTicketCents: 25000,
    receivedByMonth: [
      { month: "2026-09", receivedCents: 1000 },
      { month: "2026-10", receivedCents: 2000 },
    ],
  });
  svc.listInvoices.mockResolvedValue({
    items: [invoice()],
    total: 1,
    limit: 20,
    offset: 0,
  });
  svc.getRevenueForecast.mockResolvedValue({
    generatedAt: "2026-10-24T10:00:00Z",
    partial: true,
    totalGuaranteedCents: 50000,
    totalTrialConversionCents: 9900,
    months: [
      {
        month: "2026-10",
        guaranteedCents: 30000,
        trialConversionCents: 0,
        items: [
          {
            ownerId: "o-1",
            name: "Clínica Ortho",
            email: "a@ortho.com",
            kind: "guaranteed",
            chargeAt: "2026-10-28T12:00:00Z",
            amountCents: 30000,
            source: "preview",
          },
        ],
      },
      {
        month: "2026-11",
        guaranteedCents: 20000,
        trialConversionCents: 9900,
        items: [
          {
            ownerId: "o-2",
            name: "Clínica Cardio",
            email: "b@cardio.com",
            kind: "trial_conversion",
            chargeAt: "2026-11-10T12:00:00Z",
            amountCents: 9900,
            source: "projection",
          },
        ],
      },
    ],
  });
  svc.getDelinquency.mockResolvedValue({
    totalOpenCents: 19800,
    items: [
      {
        ownerId: "o-9",
        name: "Clínica Atrasada",
        email: "c@atrasada.com",
        planName: "Starter",
        status: "past_due",
        openCents: 19800,
        openInvoices: 2,
        pastDueSince: "2026-10-15T12:00:00Z",
        daysOverdue: 9,
        suspensionDate: "2026-10-22T12:00:00Z",
      },
    ],
  });
});

function mockMobile() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("AdminBilling", () => {
  it("mostra os KPIs da receita em reais e o gráfico dos 12 meses", async () => {
    renderWithProviders(<AdminBilling />);

    expect(await screen.findByText(/R\$\s*1\.234,56/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*3\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*36\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*250,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*50,00/)).toBeInTheDocument();
    expect(screen.getAllByTestId("money-bar-received")).toHaveLength(2);
    const table = screen.getByRole("table", {
      name: "Valores mensais em reais",
    });
    expect(within(table).getByText("set/2026")).toBeInTheDocument();
    expect(within(table).getByText(/R\$\s*20,00/)).toBeInTheDocument();
    expect(screen.getByText("7 faturas pagas")).toBeInTheDocument();
    expect(screen.getByText("2 faturas")).toBeInTheDocument();
  });

  it("troca de aba pela URL", async () => {
    renderWithProviders(<AdminBilling />);
    fireEvent.click(await screen.findByRole("tab", { name: "Previsão" }));
    expect(replace).toHaveBeenCalledWith("/admin/faturamento?tab=previsao", {
      scroll: false,
    });
  });

  it("lista faturas com link seguro para a Stripe e filtra por status", async () => {
    tabParam = "faturas";
    renderWithProviders(<AdminBilling />);

    const link = await screen.findByRole("link", { name: /Ver fatura/ });
    expect(link).toHaveAttribute("href", "https://invoice.stripe.com/i/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      within(screen.getByRole("table")).getByText("Paga"),
    ).toBeInTheDocument();
    expect(screen.getByText("BEMVINDO")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clínica Ortho" })).toHaveAttribute(
      "href",
      "/admin/clientes/o-1",
    );

    fireEvent.change(screen.getByLabelText("Status da fatura"), {
      target: { value: "open" },
    });
    await screen.findByRole("link", { name: /Ver fatura/ });
    expect(svc.listInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "open", offset: 0, limit: 20 }),
    );
  });

  it("previsão separa garantido de trial, avisa parcial e distingue a origem", async () => {
    tabParam = "previsao";
    renderWithProviders(<AdminBilling />);

    expect(
      await screen.findByText(
        "Parte da previsão é estimada: a Stripe não respondeu para algumas contas.",
      ),
    ).toBeInTheDocument();
    const guaranteed = screen.getAllByTestId("money-bar-guaranteed");
    const trial = screen.getAllByTestId("money-bar-trial");
    expect(guaranteed.map((b) => b.getAttribute("data-value"))).toEqual([
      "30000",
      "20000",
    ]);
    expect(trial.map((b) => b.getAttribute("data-value"))).toEqual([
      "0",
      "9900",
    ]);
    const nov = screen.getByRole("region", { name: "Cobranças de nov/2026" });
    expect(within(nov).getByText("Clínica Cardio")).toBeInTheDocument();
    expect(within(nov).getByText("Se converter")).toBeInTheDocument();
    expect(within(nov).getByText("Projeção")).toBeInTheDocument();
    const out = screen.getByRole("region", { name: "Cobranças de out/2026" });
    expect(within(out).getByText("Prévia da Stripe")).toBeInTheDocument();
  });

  it("previsão completa não mostra o aviso", async () => {
    tabParam = "previsao";
    svc.getRevenueForecast.mockResolvedValue({
      generatedAt: "2026-10-24T10:00:00Z",
      partial: false,
      totalGuaranteedCents: 0,
      totalTrialConversionCents: 0,
      months: [],
    });
    renderWithProviders(<AdminBilling />);
    await screen.findByText("Garantido nos próximos meses");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("inadimplência leva ao detalhe da conta", async () => {
    tabParam = "inadimplencia";
    renderWithProviders(<AdminBilling />);

    expect(await screen.findByText("Clínica Atrasada")).toBeInTheDocument();
    expect(screen.getByText("Inadimplente")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir conta" })).toHaveAttribute(
      "href",
      "/admin/clientes/o-9",
    );
  });

  it("usa singular com uma fatura", async () => {
    svc.getRevenueSummary.mockResolvedValue({
      ...(await svc.getRevenueSummary()),
      receivedInvoices: 1,
      openInvoices: 1,
    });
    renderWithProviders(<AdminBilling />);
    expect(await screen.findByText("1 fatura paga")).toBeInTheDocument();
    expect(screen.getByText("1 fatura")).toBeInTheDocument();
  });

  it("mostra erro quando a receita falha", async () => {
    svc.getRevenueSummary.mockRejectedValue(new Error("x"));
    renderWithProviders(<AdminBilling />);
    expect(
      await screen.findByText("Não foi possível carregar a receita"),
    ).toBeInTheDocument();
  });

  describe("no celular", () => {
    beforeEach(mockMobile);
    afterEach(() => vi.unstubAllGlobals());

    it("faturas viram cards com status, conta e link da Stripe", async () => {
      tabParam = "faturas";
      renderWithProviders(<AdminBilling />);
      const link = await screen.findByRole("link", { name: /Ver fatura/ });
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const card = link.closest("li")!;
      expect(within(card).getByText("Paga")).toBeInTheDocument();
      expect(
        within(card).getByRole("link", { name: "Clínica Ortho" }),
      ).toHaveAttribute("href", "/admin/clientes/o-1");
      expect(within(card).getByText("Cupom")).toBeInTheDocument();
      expect(within(card).getByText("BEMVINDO")).toBeInTheDocument();
    });

    it("inadimplência e previsão viram cards", async () => {
      tabParam = "inadimplencia";
      const { unmount } = renderWithProviders(<AdminBilling />);
      const nome = await screen.findByText("Clínica Atrasada");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const card = nome.closest("li")!;
      expect(within(card).getByText("Inadimplente")).toBeInTheDocument();
      expect(within(card).getByText("Dias de atraso")).toBeInTheDocument();
      expect(
        within(card).getByRole("link", { name: "Abrir conta" }),
      ).toHaveAttribute("href", "/admin/clientes/o-9");
      unmount();

      tabParam = "previsao";
      renderWithProviders(<AdminBilling />);
      const nov = await screen.findByRole("region", {
        name: "Cobranças de nov/2026",
      });
      expect(within(nov).queryByRole("table")).not.toBeInTheDocument();
      const item = within(nov).getByText("Clínica Cardio").closest("li")!;
      expect(within(item).getByText("Se converter")).toBeInTheDocument();
      expect(within(item).getByText("Valor")).toBeInTheDocument();
    });
  });
});
