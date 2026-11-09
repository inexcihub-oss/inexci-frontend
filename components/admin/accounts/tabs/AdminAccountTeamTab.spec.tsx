import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getAccountTeam: vi.fn(),
  getAccountSecurity: vi.fn(),
  getAccountSecurityLogs: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminAccountTeamTab } from "./AdminAccountTeamTab";

const member = (over: Record<string, unknown> = {}) => ({
  id: "u-1",
  name: "Dra. Ana",
  email: "ana@clinica.com",
  role: "owner",
  isDoctor: true,
  permissions: ["agenda", "atendimento", "solicitacoes", "administracao"],
  active: true,
  status: "active",
  lastSeenAt: null,
  mfaEnabled: true,
  privacyPolicyAcceptedAt: "2026-10-01T15:00:00Z",
  termsOfUseAcceptedAt: "2026-10-01T15:00:00Z",
  aiConsentAcceptedAt: "2026-10-02T15:00:00Z",
  whatsappPhoneMasked: "*******9999",
  onboarding: {
    status: "completed",
    completedSteps: 12,
    totalSteps: 12,
    toursSeen: 9,
    totalTours: 9,
  },
  usage: {
    surgeryRequests: 4,
    appointments: 11,
    recordsFinalized: 9,
    assistantMessages: 23,
    aiCostUsdCents: 150,
  },
  ...over,
});

const zeros = {
  login_failed: 0,
  login_locked: 0,
  mfa_failed: 0,
  refresh_reuse: 0,
  password_changed: 0,
  mfa_enabled: 0,
  mfa_disabled: 0,
};

const security = (over: Record<string, unknown> = {}) => ({
  ownerId: "o-1",
  fromDay: "2026-09-29",
  toDay: "2026-10-28",
  totals: { ...zeros, login_failed: 3, refresh_reuse: 1 },
  daily: [],
  users: [
    {
      userId: "u-1",
      userName: "Dra. Ana",
      events: { ...zeros, login_failed: 3, refresh_reuse: 1 },
      failures: 3,
      sessionsRevoked: 1,
      lastSeenAt: "2026-10-27T12:00:00Z",
    },
  ],
  mfa: { activeUsers: 2, withoutMfa: 1 },
  lokiAvailable: false,
  ...over,
});

const team = (items = [member()]) => ({
  from: "2026-09-28T12:00:00Z",
  to: "2026-10-28T12:00:00Z",
  days: 30,
  items,
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAccountSecurity.mockResolvedValue(security());
  svc.getAccountSecurityLogs.mockResolvedValue({
    logs: [
      {
        timestamp: "2026-10-27T12:00:00Z",
        level: "warn",
        message: "[AUTH_MFA_LOCKED] userId=u-1 ip=189.40.12.x",
        requestId: "r1",
      },
    ],
    lokiAvailable: true,
    lokiError: null,
  });
  svc.getAccountTeam.mockResolvedValue(
    team([
      member(),
      member({
        id: "u-2",
        name: "Bia Secretária",
        email: "bia@clinica.com",
        role: "collaborator",
        isDoctor: false,
        permissions: ["agenda"],
        active: false,
        status: "pending",
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
          appointments: 2,
          recordsFinalized: 0,
          assistantMessages: 0,
          aiCostUsdCents: 0,
        },
      }),
    ]),
  );
});

describe("AdminAccountTeamTab", () => {
  it("resume a equipe: integrantes, duas etapas, consentimento de IA e mensagens", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);

    expect(
      await screen.findByText("Integrantes", { selector: "p" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Verificação em duas etapas").closest("div.flex.h-full"),
    ).toHaveTextContent("1 de 2");
    expect(
      screen.getByText("Consentimento de IA").closest("div.flex.h-full"),
    ).toHaveTextContent("1 de 2");
    expect(
      screen
        .getByText("Mensagens ao assistente", { selector: "p" })
        .closest("div.flex.h-full"),
    ).toHaveTextContent("23");
  });

  it("mostra por integrante acesso, consentimentos, WhatsApp mascarado, onboarding e uso", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    const ana = rows[1];
    expect(ana).toHaveTextContent("Dra. Ana");
    expect(ana).toHaveTextContent("Dono");
    expect(ana).toHaveTextContent("Médico");
    expect(ana).toHaveTextContent("Duas etapas ligada");
    expect(ana).toHaveTextContent("Termos em 01/10/2026");
    expect(ana).toHaveTextContent("IA em 02/10/2026");
    expect(ana).toHaveTextContent("*******9999");
    expect(ana).toHaveTextContent("Concluído");
    expect(ana).toHaveTextContent("12 de 12 etapas");
    expect(ana).toHaveTextContent("SCs criadas4");
    expect(ana).toHaveTextContent("US$ 1,50");

    const bia = rows[2];
    expect(bia).toHaveTextContent("Convite pendente");
    expect(bia).toHaveTextContent("Sem duas etapas");
    expect(bia).toHaveTextContent("Termos pendentes");
    expect(bia).toHaveTextContent("IA não autorizada");
    expect(bia).toHaveTextContent("Não vinculado");
    expect(bia).toHaveTextContent("Não iniciado");
  });

  it("no celular, cada integrante vira um cartão", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    const card = await screen.findByRole("listitem", {
      name: "Bia Secretária",
    });
    expect(card).toHaveTextContent("Convite pendente");
    expect(card).toHaveTextContent("Áreas: Agenda");
    expect(card.closest("ul")).toHaveClass("md:hidden");
  });

  it("não oferece nenhuma ação de alteração", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    await screen.findByRole("table");
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["7 dias", "30 dias", "90 dias"]);
  });

  it("troca a janela de uso e refaz a consulta", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    await screen.findByRole("table");
    expect(svc.getAccountTeam).toHaveBeenCalledWith("o-1", 30);

    fireEvent.click(screen.getByRole("button", { name: "7 dias" }));

    await waitFor(() =>
      expect(svc.getAccountTeam).toHaveBeenCalledWith("o-1", 7),
    );
    expect(screen.getByRole("button", { name: "7 dias" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("mostra falhas de login e sessões derrubadas por integrante", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);

    const table = await screen.findByRole("table");
    await waitFor(() =>
      expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
        "3 falhas de login",
      ),
    );
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("1 vez com sessões derrubadas");
    expect(rows[2]).toHaveTextContent("Sem alertas de segurança");
    expect(svc.getAccountSecurity).toHaveBeenCalledWith("o-1", 30);
  });

  it("destaca integrante ativo sem duas etapas", async () => {
    svc.getAccountTeam.mockResolvedValue(
      team([member(), member({ id: "u-3", name: "Caio", mfaEnabled: false })]),
    );
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);

    const aviso = await screen.findByRole("note", {
      name: "Sem verificação em duas etapas",
    });
    expect(aviso).toHaveTextContent(
      "1 integrante ativo está sem verificação em duas etapas: Caio.",
    );
    const table = screen.getByRole("table");
    const caio = within(table).getAllByRole("row")[2];
    expect(caio).toHaveClass("bg-amber-50/50");
    expect(within(table).getAllByRole("row")[1]).not.toHaveClass(
      "bg-amber-50/50",
    );
  });

  it("convite pendente sem duas etapas não entra no destaque", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    await screen.findByRole("table");
    expect(
      screen.queryByRole("note", { name: "Sem verificação em duas etapas" }),
    ).toBeNull();
  });

  it("sem Grafana, avisa que os registros não estão disponíveis", async () => {
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    expect(
      await screen.findByText(/Os registros de autenticação vêm do Grafana/),
    ).toBeInTheDocument();
    expect(svc.getAccountSecurityLogs).not.toHaveBeenCalled();
  });

  it("com Grafana, carrega os registros só quando pedido", async () => {
    svc.getAccountSecurity.mockResolvedValue(security({ lokiAvailable: true }));
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);

    const botao = await screen.findByRole("button", {
      name: "Carregar registros do Grafana",
    });
    expect(svc.getAccountSecurityLogs).not.toHaveBeenCalled();
    fireEvent.click(botao);

    const lista = await screen.findByRole("list", {
      name: "Registros de autenticação",
    });
    expect(lista).toHaveTextContent("ip=189.40.12.x");
    expect(svc.getAccountSecurityLogs).toHaveBeenCalledWith("o-1", 30);
  });

  it("equipe vazia mostra o estado vazio", async () => {
    svc.getAccountTeam.mockResolvedValue(team([]));
    renderWithProviders(<AdminAccountTeamTab ownerId="o-1" />);
    expect(
      await screen.findByText("Nenhum integrante na equipe"),
    ).toBeInTheDocument();
  });
});
