import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const replace = vi.fn();
let tabParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/clientes/o-1",
  useSearchParams: () =>
    new URLSearchParams(tabParam ? `tab=${tabParam}&x=1` : "x=1"),
}));

const svc = vi.hoisted(() => ({
  getAccount: vi.fn(),
  getAccountSubscription: vi.fn(),
  getAccountTeam: vi.fn(),
  listAuditLogs: vi.fn(),
  getAiUsageReport: vi.fn(),
  listAccountInvoices: vi.fn(),
  deactivateAccount: vi.fn(),
  reactivateAccount: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminAccountDetail } from "./AdminAccountDetail";

const account = {
  ownerId: "o-1",
  name: "Clínica Ortho",
  email: "contato@ortho.com",
  createdAt: "2026-10-10T10:00:00Z",
  plan: { id: "p-1", name: "Starter", priceCents: 0, billingPeriod: "MONTHLY" },
  situation: "trial",
  daysLeft: 4,
  daysOverdue: null,
  trialEndsAt: "2026-10-28T10:00:00Z",
  currentPeriodEnd: "2026-10-28T10:00:00Z",
  monthlyAmountCents: 0,
  hasGatewaySubscription: false,
  doctors: 1,
  collaborators: 2,
  surgeryRequestsThisMonth: 3,
  surgeryRequestsTotal: 9,
  quota: { used: 3, limit: 10 },
  appointmentsThisMonth: 24,
  aiCostThisMonthUsdCents: 210,
  lastSeenAt: null,
  accountDeactivatedAt: null,
  accountDeactivatedByName: null,
  usage: {
    from: "2026-10-01T00:00:00Z",
    to: "2026-11-01T00:00:00Z",
    surgeryRequestsByStatus: [],
    appointments: { scheduled: 4, completed: 18, cancelled: 0, noShow: 2 },
    patients: { total: 41, newInPeriod: 6 },
    finalizedRecordsInPeriod: 7,
    aiMessagesInPeriod: 31,
    activity: [
      { weekStart: "2026-10-05", surgeryRequests: 1, appointments: 4 },
      { weekStart: "2026-10-12", surgeryRequests: 2, appointments: 6 },
    ],
  },
};

const subscription = {
  situation: "trial",
  daysLeft: 4,
  daysOverdue: null,
  status: "trialing",
  plan: account.plan,
  monthlyAmountCents: 0,
  trialEndsAt: "2026-10-28T10:00:00Z",
  currentPeriodStart: "2026-10-10T10:00:00Z",
  currentPeriodEnd: "2026-10-28T10:00:00Z",
  cancelAtPeriodEnd: false,
  pastDueSince: null,
  suspendedAt: null,
  canceledAt: null,
  gatewayCustomerId: "cus_1",
  gatewaySubscriptionId: "sub_1",
  stripeCustomerUrl: "https://dashboard.stripe.com/test/customers/cus_1",
  gateway: null,
  gatewayError: false,
  canGrantInternalAccess: true,
  internalAccessBlockedReason: null,
  canExtendTrial: true,
  trialExtensionBlockedReason: null,
  canDeactivate: true,
  deactivationBlockedReason: null,
  internalAccessGrantedAt: null,
  internalAccessGrantedByName: null,
};

describe("AdminAccountDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabParam = null;
    svc.getAccount.mockResolvedValue(account);
    svc.listAccountInvoices.mockResolvedValue({
      items: [
        {
          id: "i-1",
          gatewayInvoiceId: "in_1",
          ownerId: "o-1",
          ownerName: "Clínica Ortho",
          ownerEmail: "contato@ortho.com",
          status: "paid",
          amountDueCents: 9900,
          amountPaidCents: 9900,
          amountRemainingCents: 0,
          amountDiscountCents: 0,
          currency: "brl",
          couponCode: null,
          dueDate: null,
          paidAt: "2026-10-05T12:00:00Z",
          periodStart: null,
          periodEnd: null,
          invoiceCreatedAt: "2026-10-05T12:00:00Z",
          hostedInvoiceUrl: "https://invoice.stripe.com/i/1",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    svc.getAccountSubscription.mockResolvedValue(subscription);
    svc.getAccountTeam.mockResolvedValue({
      from: "2026-09-28T12:00:00Z",
      to: "2026-10-28T12:00:00Z",
      days: 30,
      items: [
        {
          id: "u-1",
          name: "Dr. Ortho",
          email: "dr@ortho.com",
          role: "owner",
          isDoctor: true,
          permissions: ["agenda", "atendimento"],
          active: true,
          status: "active",
          lastSeenAt: null,
          mfaEnabled: false,
          privacyPolicyAcceptedAt: null,
          termsOfUseAcceptedAt: null,
          aiConsentAcceptedAt: null,
          whatsappPhoneMasked: null,
          onboarding: {
            status: "not_started",
            completedSteps: 0,
            totalSteps: 12,
            toursSeen: 0,
            totalTours: 9,
          },
          usage: {
            surgeryRequests: 0,
            appointments: 0,
            recordsFinalized: 0,
            assistantMessages: 0,
            aiCostUsdCents: 0,
          },
        },
      ],
    });
    svc.listAuditLogs.mockResolvedValue({ items: [], total: 0 });
  });

  it("mostra o cabeçalho, os KPIs e as nove abas", async () => {
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);

    expect(
      await screen.findByRole("heading", { name: "Clínica Ortho" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/contato@ortho.com/)).toBeInTheDocument();
    expect(screen.getByText("Trial · faltam 4 dias")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Visão geral",
      "Ativação",
      "Assinatura",
      "Faturas",
      "Equipe",
      "Uso de IA",
      "Erros",
      "Prontuário (LGPD)",
      "Histórico de ações",
    ]);
    expect(screen.getByText("SCs no mês")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByText("Atividade por semana")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Gerenciar assinatura/ }),
      ).toBeEnabled(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Abrir na Stripe/ }),
      ).toHaveAttribute(
        "href",
        "https://dashboard.stripe.com/test/customers/cus_1",
      ),
    );
  });

  it("botões do cabeçalho seguem o mesmo tamanho da barra de ferramentas", async () => {
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);
    const stripe = await screen.findByRole("link", { name: /Abrir na Stripe/ });
    expect(stripe).toHaveClass("ds-toolbar-btn");
    expect(stripe).not.toHaveTextContent("↗");
    expect(
      screen.getByRole("button", { name: /Gerenciar assinatura/ }),
    ).toHaveClass("ds-toolbar-btn-primary");
    expect(
      screen.getByRole("link", { name: "Voltar para Contas" }),
    ).toHaveClass("ds-toolbar-btn", "ds-toolbar-icon");
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveClass("border-b-[3px]");
    }
  });

  it("troca de aba e atualiza ?tab= preservando os outros parâmetros", async () => {
    const view = renderWithProviders(<AdminAccountDetail ownerId="o-1" />);
    await screen.findByRole("heading", { name: "Clínica Ortho" });

    fireEvent.click(screen.getByRole("tab", { name: "Equipe" }));
    expect(replace).toHaveBeenCalledWith("/admin/clientes/o-1?x=1&tab=equipe", {
      scroll: false,
    });
    tabParam = "equipe";
    view.rerender(<AdminAccountDetail ownerId="o-1" />);
    expect((await screen.findAllByText("Dr. Ortho")).length).toBeGreaterThan(0);
    expect(screen.getByText("Agenda, Atendimento")).toBeInTheDocument();

    tabParam = "faturas";
    view.rerender(<AdminAccountDetail ownerId="o-1" />);
    expect(await screen.findByText("Ver fatura")).toBeInTheDocument();
    expect(svc.listAccountInvoices).toHaveBeenCalledWith("o-1", {
      limit: 20,
      offset: 0,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Histórico de ações" }));
    tabParam = "historico";
    view.rerender(<AdminAccountDetail ownerId="o-1" />);
    expect(
      await screen.findByText("Nenhuma ação da equipe nesta conta"),
    ).toBeInTheDocument();
    expect(svc.listAuditLogs).toHaveBeenCalledWith({
      targetOwnerId: "o-1",
      limit: 50,
    });
  });

  it("troca o painel quando a URL muda depois da montagem", async () => {
    const view = renderWithProviders(<AdminAccountDetail ownerId="o-1" />);
    await screen.findByRole("heading", { name: "Clínica Ortho" });
    expect(screen.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    tabParam = "equipe";
    view.rerender(<AdminAccountDetail ownerId="o-1" />);

    expect(screen.getByRole("tab", { name: "Equipe" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect((await screen.findAllByText("Dr. Ortho")).length).toBeGreaterThan(0);
  });

  it("abre na aba indicada pela URL", async () => {
    tabParam = "ia";
    svc.getAiUsageReport.mockResolvedValue([
      {
        groupKey: "u-1",
        name: "Dr. Ortho",
        email: "dr@ortho.com",
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 2000,
        totalCalls: 5,
        totalRecords: 4,
        costUsdCents: 250,
        avgLatencyMs: 100,
      },
    ]);
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);
    expect(
      await screen.findByText("Custo de IA no período"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Dr. Ortho")).toBeInTheDocument();
    expect(svc.getAiUsageReport).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: "user", ownerId: "o-1" }),
    );
    expect(screen.getByRole("tab", { name: "Uso de IA" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("avisa quando a Stripe falhou sem quebrar a página", async () => {
    tabParam = "assinatura";
    svc.getAccountSubscription.mockResolvedValue({
      ...subscription,
      gatewayError: true,
      gateway: null,
    });
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Não foi possível consultar a Stripe/,
    );
    expect(
      screen.getByRole("heading", { name: "Clínica Ortho" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
  });

  it("mostra estado de erro quando a conta não existe", async () => {
    svc.getAccount.mockRejectedValue(new Error("404"));
    renderWithProviders(<AdminAccountDetail ownerId="o-x" />);
    expect(await screen.findByText("Conta não encontrada")).toBeInTheDocument();
  });

  it("desativa a conta com motivo e explica o efeito", async () => {
    svc.deactivateAccount.mockResolvedValue({
      auditLogId: "a-1",
      accountDeactivatedAt: "2026-10-28T12:00:00Z",
      revokedUsers: 3,
    });
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);

    const botao = await screen.findByRole("button", {
      name: /Desativar conta/,
    });
    expect(botao).toHaveClass("ds-toolbar-btn");
    fireEvent.click(botao);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("as sessões abertas caem na hora");
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Contrato encerrado" },
    });
    const confirmar = screen
      .getAllByRole("button", { name: "Desativar conta" })
      .find((b) => dialog.contains(b))!;
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(svc.deactivateAccount).toHaveBeenCalledWith("o-1", {
        reason: "Contrato encerrado",
      }),
    );
  });

  it("com cobrança viva na Stripe, explica o bloqueio e não deixa confirmar", async () => {
    svc.getAccountSubscription.mockResolvedValue({
      ...subscription,
      canDeactivate: false,
      deactivationBlockedReason:
        "A conta tem assinatura com cobrança na Stripe. Peça ao cliente para cancelar pelo portal de pagamento antes de desativar.",
    });
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);
    await waitFor(() => expect(svc.getAccountSubscription).toHaveBeenCalled());
    await screen.findByRole("link", { name: /Abrir na Stripe/ });

    fireEvent.click(screen.getByRole("button", { name: /Desativar conta/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("cancelar pelo portal de pagamento");
    const confirmar = screen
      .getAllByRole("button", { name: "Desativar conta" })
      .find((b) => dialog.contains(b))!;
    expect(confirmar).toBeDisabled();
    expect(screen.queryByLabelText(/Motivo/)).toBeNull();
    expect(svc.deactivateAccount).not.toHaveBeenCalled();
  });

  it("conta desativada mostra o aviso, o selo e o botão de reativar", async () => {
    svc.getAccount.mockResolvedValue({
      ...account,
      situation: "deactivated",
      accountDeactivatedAt: "2026-10-20T15:00:00Z",
      accountDeactivatedByName: "Ana Admin",
    });
    svc.reactivateAccount.mockResolvedValue({
      auditLogId: "a-2",
      accountDeactivatedAt: null,
      revokedUsers: 0,
    });
    renderWithProviders(<AdminAccountDetail ownerId="o-1" />);

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("Conta desativada em 20/10/2026");
    expect(aviso).toHaveTextContent("por Ana Admin");
    expect(aviso).toHaveTextContent("Ninguém da clínica consegue entrar");
    expect(screen.getByText("Desativada · desde 20/10")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Desativar conta/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Reativar conta/ }));
    fireEvent.change(await screen.findByLabelText(/Motivo/), {
      target: { value: "Cliente voltou" },
    });
    const dialog = screen.getByRole("dialog");
    const confirmar = screen
      .getAllByRole("button", { name: "Reativar conta" })
      .find((b) => dialog.contains(b))!;
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(svc.reactivateAccount).toHaveBeenCalledWith("o-1", {
        reason: "Cliente voltou",
      }),
    );
  });
});
