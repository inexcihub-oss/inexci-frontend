import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const replace = vi.fn();
const push = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/admin/clientes",
  useSearchParams: () => new URLSearchParams(query),
}));

const listAccounts = vi.fn();
const listAllAccounts = vi.fn();
const listPlans = vi.fn();
vi.mock("@/services/admin.service", () => ({
  adminService: {
    listAccounts: (...a: unknown[]) => listAccounts(...a),
    listAllAccounts: (...a: unknown[]) => listAllAccounts(...a),
    listPlans: (...a: unknown[]) => listPlans(...a),
  },
}));

import { AdminAccountsList } from "./AdminAccountsList";

const item = {
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
  quota: { used: 3, limit: -1 },
  appointmentsThisMonth: 5,
  aiCostThisMonthUsdCents: 1240,
  lastSeenAt: null,
  health: {
    score: 35,
    band: "risk",
    mainReason: "Ninguém da clínica acessa há 31 dias",
  },
};

const counts = {
  all: 12,
  trial: 5,
  trial_expired: 0,
  active: 4,
  cancel_scheduled: 0,
  past_due: 2,
  suspended: 0,
  canceled: 0,
  internal: 1,
  deactivated: 3,
};

describe("AdminAccountsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = "";
    listAccounts.mockResolvedValue({ items: [item], total: 1, counts });
    listPlans.mockResolvedValue([
      { id: "p-1", name: "Starter", billingPeriod: "MONTHLY" },
    ]);
  });

  it("mostra as colunas da conta e as contagens do controle segmentado", async () => {
    renderWithProviders(<AdminAccountsList />);

    expect(await screen.findByText("Clínica Ortho")).toBeInTheDocument();
    expect(screen.getByText("contato@ortho.com")).toBeInTheDocument();
    expect(screen.getByText("Trial · faltam 4 dias")).toBeInTheDocument();
    expect(screen.getByText("1 méd · 2 colab")).toBeInTheDocument();
    expect(screen.getByText("3 / ∞")).toBeInTheDocument();
    expect(screen.getByText(/US\$\s12,40/)).toBeInTheDocument();
    expect(screen.getByText("nunca")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Todas (12)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Em trial (5)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pagantes (4)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inadimplentes (2)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Acesso interno (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Desativadas (3)" }),
    ).toBeInTheDocument();
  });

  it("converte os filtros em query string", async () => {
    renderWithProviders(<AdminAccountsList />);
    await screen.findByText("Clínica Ortho");

    fireEvent.click(screen.getByRole("button", { name: /Em trial/ }));
    expect(replace).toHaveBeenLastCalledWith("/admin/clientes?situacao=trial", {
      scroll: false,
    });

    fireEvent.click(screen.getByLabelText("Trial acabando em 3 dias"));
    expect(replace).toHaveBeenLastCalledWith("/admin/clientes?trial=3", {
      scroll: false,
    });

    fireEvent.click(screen.getByLabelText("Sem acesso há 7 dias"));
    expect(replace).toHaveBeenLastCalledWith("/admin/clientes?inativos=7", {
      scroll: false,
    });
  });

  it("envia os filtros da URL para a API", async () => {
    query = "situacao=trial&trial=3&inativos=7&q=ortho&plano=p-1";
    renderWithProviders(<AdminAccountsList />);

    await waitFor(() =>
      expect(listAccounts).toHaveBeenCalledWith({
        search: "ortho",
        situation: "trial",
        planId: "p-1",
        trialEndingInDays: 3,
        inactiveDays: 7,
        limit: 25,
        offset: 0,
      }),
    );
  });

  it("aceita trial=7 vindo dos alertas do dashboard", async () => {
    query = "trial=7";
    renderWithProviders(<AdminAccountsList />);

    await waitFor(() =>
      expect(listAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ trialEndingInDays: 7 }),
      ),
    );
    expect(
      await screen.findByText("Trial acabando em 7 dias"),
    ).toBeInTheDocument();
  });

  it("mostra a coluna Saúde com nota, faixa e o principal motivo", async () => {
    listAccounts.mockResolvedValue({
      items: [
        item,
        { ...item, ownerId: "o-2", name: "Sem nota", health: null },
      ],
      total: 2,
      counts,
    });
    renderWithProviders(<AdminAccountsList />);

    expect(
      await screen.findByRole("columnheader", { name: "Saúde" }),
    ).toBeInTheDocument();
    const badge = screen.getByText("35 · Em risco");
    expect(badge).toHaveAttribute(
      "title",
      "Ninguém da clínica acessa há 31 dias",
    );
    expect(badge).toHaveClass("text-red-700");
    expect(
      screen.getByTitle(
        "Sem nota: conta cancelada, desativada ou ainda não avaliada",
      ),
    ).toHaveTextContent("—");
  });

  it("filtro de saúde e ordenação pela pior nota vão para a URL", async () => {
    renderWithProviders(<AdminAccountsList />);
    await screen.findByText("Clínica Ortho");

    fireEvent.change(screen.getByLabelText("Saúde"), {
      target: { value: "atencao" },
    });
    expect(replace).toHaveBeenLastCalledWith("/admin/clientes?saude=atencao", {
      scroll: false,
    });

    fireEvent.change(screen.getByLabelText("Ordenar"), {
      target: { value: "saude" },
    });
    expect(replace).toHaveBeenLastCalledWith("/admin/clientes?ordem=saude", {
      scroll: false,
    });
  });

  it("saúde e ordem da URL (links do dashboard) vão para a API", async () => {
    query = "saude=risco&ordem=saude";
    renderWithProviders(<AdminAccountsList />);

    await waitFor(() =>
      expect(listAccounts).toHaveBeenCalledWith(
        expect.objectContaining({
          health: "risk",
          sortBy: "health",
          sortDir: "asc",
        }),
      ),
    );
  });

  it("saúde inválida na URL é ignorada", async () => {
    query = "saude=otima";
    renderWithProviders(<AdminAccountsList />);

    await waitFor(() => expect(listAccounts).toHaveBeenCalled());
    expect(listAccounts.mock.calls[0][0]).toMatchObject({ health: undefined });
    expect(listAccounts.mock.calls[0][0]).not.toHaveProperty("sortBy");
  });

  it("abre o detalhe ao clicar na linha", async () => {
    renderWithProviders(<AdminAccountsList />);
    fireEvent.click(await screen.findByText("Clínica Ortho"));
    expect(push).toHaveBeenCalledWith("/admin/clientes/o-1");
  });

  it("filtro de plano usa os planos do painel admin", async () => {
    renderWithProviders(<AdminAccountsList />);
    await screen.findByText("Clínica Ortho");
    await waitFor(() => expect(listPlans).toHaveBeenCalled());
  });

  it("exporta o CSV com todas as contas do filtro, não só a página", async () => {
    listAllAccounts.mockResolvedValue([item, { ...item, ownerId: "o-2" }]);
    const createObjectURL = vi.fn().mockReturnValue("blob:x");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderWithProviders(<AdminAccountsList />);
    await screen.findByText("Clínica Ortho");
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    const filtros = listAllAccounts.mock.calls[0][0] as Record<string, unknown>;
    expect(filtros).not.toHaveProperty("limit");
    expect(filtros).not.toHaveProperty("offset");
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("mostra estado vazio sem resultados", async () => {
    listAccounts.mockResolvedValue({ items: [], total: 0, counts });
    renderWithProviders(<AdminAccountsList />);
    expect(
      await screen.findByText("Nenhuma conta encontrada"),
    ).toBeInTheDocument();
  });

  describe("no celular", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((q: string) => ({
          matches: q === "(max-width: 639px)",
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    });
    afterEach(() => vi.unstubAllGlobals());

    it("mostra cada conta como card e os filtros atrás do botão Filtros", async () => {
      query = "plano=p-1&saude=risco";
      renderWithProviders(<AdminAccountsList />);

      const card = await screen.findByRole("link", {
        name: "Abrir Clínica Ortho",
      });
      expect(card.tagName).toBe("LI");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(within(card).getByText("Plano").tagName).toBe("DT");
      expect(within(card).getByText("1 méd · 2 colab")).toBeInTheDocument();

      expect(screen.queryByRole("combobox", { name: "Plano" })).toBeNull();
      const filtros = screen.getByRole("button", { name: /Filtros/ });
      expect(filtros).toHaveTextContent("2");
      fireEvent.click(filtros);
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(
        within(dialog).getByRole("combobox", { name: "Ordenar" }),
        {
          target: { value: "saude" },
        },
      );
      expect(replace).toHaveBeenLastCalledWith(
        expect.stringContaining("ordem=saude"),
        { scroll: false },
      );
    });
  });
});
