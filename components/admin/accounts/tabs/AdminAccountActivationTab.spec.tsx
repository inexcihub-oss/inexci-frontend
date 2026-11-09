import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({ getAccountActivation: vi.fn() }));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminAccountActivationTab } from "./AdminAccountActivationTab";

const STEP_KEYS = [
  "conhecer-plataforma",
  "criar-solicitacao",
  "enviar-solicitacao",
  "criar-por-documento",
  "assinatura-do-medico",
  "cabecalho-do-medico",
  "marcar-consulta",
  "atender-consulta",
  "cadastros-basicos",
  "convidar-colaborador",
  "plano-e-cota",
  "ver-dashboard",
];
const TRACK_KEYS = [
  "boas-vindas",
  "solicitacoes",
  "documentos-do-medico",
  "atendimento",
  "agenda",
  "cadastros",
  "administracao",
  "plano-e-cota",
  "dashboard",
];

const activation = (over: Record<string, unknown> = {}) => ({
  signupAt: "2026-10-01T15:00:00Z",
  activatedAt: "2026-10-04T15:00:00Z",
  daysToActivate: 3,
  milestones: [
    { key: "first_patient", at: "2026-10-02T15:00:00Z", daysFromSignup: 1 },
    { key: "first_appointment", at: "2026-10-04T15:00:00Z", daysFromSignup: 3 },
    { key: "first_surgery_request", at: null, daysFromSignup: null },
    { key: "first_sent_to_insurer", at: null, daysFromSignup: null },
    { key: "first_whatsapp", at: "2026-10-01T18:00:00Z", daysFromSignup: 0 },
  ],
  onboarding: {
    members: 3,
    byStatus: [
      { status: "not_started", count: 1 },
      { status: "in_progress", count: 1 },
      { status: "dismissed", count: 0 },
      { status: "completed", count: 1 },
    ],
    steps: STEP_KEYS.map((key) => ({
      key,
      completedBy: key === "marcar-consulta" ? 2 : 0,
      firstCompletedAt:
        key === "marcar-consulta" ? "2026-10-03T15:00:00Z" : null,
    })),
    tracks: TRACK_KEYS.map((key) => ({
      key,
      seenBy: key === "agenda" ? 2 : 0,
    })),
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAccountActivation.mockResolvedValue(activation());
});

describe("AdminAccountActivationTab", () => {
  it("mostra o tempo até ativar e os marcos com a distância do cadastro", async () => {
    renderWithProviders(<AdminAccountActivationTab ownerId="o-1" />);

    expect(await screen.findByText("3 dias")).toBeInTheDocument();
    expect(screen.getByText("Cadastro em 01/10/2026")).toBeInTheDocument();
    expect(screen.getByText("3 de 5")).toBeInTheDocument();

    const marcos = screen.getByRole("region", { name: "Marcos de ativação" });
    const itens = marcos.querySelectorAll("li");
    expect(itens[0]).toHaveTextContent("Primeiro paciente");
    expect(itens[0]).toHaveTextContent("1 dia após o cadastro");
    expect(itens[0]).toHaveTextContent("02/10/2026");
    expect(itens[2]).toHaveTextContent("Primeira solicitação cirúrgica");
    expect(itens[2]).toHaveTextContent("Ainda não aconteceu");
    expect(itens[4]).toHaveTextContent("No dia do cadastro");
    expect(svc.getAccountActivation).toHaveBeenCalledWith("o-1");
  });

  it("mostra o onboarding da equipe por status, etapa e trilha", async () => {
    renderWithProviders(<AdminAccountActivationTab ownerId="o-1" />);

    expect(await screen.findByText("Concluído: 1")).toBeInTheDocument();
    expect(screen.getByText("Em andamento: 1")).toBeInTheDocument();
    const passos = screen.getByRole("region", { name: "Primeiros passos" });
    expect(passos).toHaveTextContent("Marcar uma consulta2 de 3 · 03/10/2026");
    expect(passos.querySelectorAll("li")).toHaveLength(12);
    const tours = screen.getByRole("region", { name: "Tours vistos" });
    expect(tours).toHaveTextContent("Marcar uma consulta2 de 3");
  });

  it("conta sem consulta nem SC aparece como não ativada", async () => {
    svc.getAccountActivation.mockResolvedValue(
      activation({ activatedAt: null, daysToActivate: null }),
    );
    renderWithProviders(<AdminAccountActivationTab ownerId="o-1" />);
    expect(await screen.findByText("Ainda não")).toBeInTheDocument();
  });

  it("erro mostra o estado vazio", async () => {
    svc.getAccountActivation.mockRejectedValue(new Error("falha"));
    renderWithProviders(<AdminAccountActivationTab ownerId="o-1" />);
    expect(
      await screen.findByText("Não foi possível carregar a ativação"),
    ).toBeInTheDocument();
  });
});
