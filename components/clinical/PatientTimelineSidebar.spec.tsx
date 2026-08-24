import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { Appointment } from "@/services/appointment.service";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: { updateStatus: vi.fn(), delete: vi.fn() },
  };
});

// Médico com Agenda (para as ações do modal de consulta) — Solicitações
// varia por teste, é o eixo do grupo 4 do mapa de permissões.
let authState: {
  isDoctor: boolean;
  can: (p: Permission) => boolean;
} = {
  isDoctor: true,
  can: (p) => p === Permission.AGENDA || p === Permission.SOLICITACOES,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import { appointmentService } from "@/services/appointment.service";
import { PatientTimelineSidebar } from "./PatientTimelineSidebar";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const surgery: SurgeryRequestListItem = {
  id: "sc-1",
  status: 5,
  surgeryDate: "2026-08-10T12:00:00.000Z",
  createdAt: "2026-08-01T12:00:00.000Z",
  patient: { id: "p-1", name: "Ana Beatriz" },
  procedure: { id: "proc-1", name: "Artroscopia de joelho" },
} as unknown as SurgeryRequestListItem;

const appointment: Appointment = {
  id: "a-1",
  doctorId: "d-1",
  patientId: "p-1",
  type: "return",
  status: "confirmed",
  scheduledAt: "2026-07-20T13:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  patient: { id: "p-1", name: "Ana Beatriz" },
} as unknown as Appointment;

function renderSidebar() {
  return render(
    <PatientTimelineSidebar
      appointments={[appointment]}
      loadingAppointments={false}
      surgeries={[surgery]}
      loadingSurgeries={false}
      onReload={vi.fn()}
    />,
  );
}

describe("PatientTimelineSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      isDoctor: true,
      can: (p) => p === Permission.AGENDA || p === Permission.SOLICITACOES,
    };
  });

  /**
   * Grupo 4 do mapa: o card da cirurgia é a ponte deliberada da timeline e
   * continua visível sem Solicitações — só o link/chevron para o detalhe
   * (que o guard de rota devolveria de qualquer jeito) some.
   */
  it("mantém o card da cirurgia mas não navega para o detalhe sem Solicitações", async () => {
    authState = { isDoctor: true, can: (p) => p === Permission.AGENDA };
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByText(/Artroscopia de joelho/)).toBeInTheDocument();
    await user.click(screen.getByText(/Artroscopia de joelho/));

    expect(push).not.toHaveBeenCalled();
  });

  it("navega para o detalhe da cirurgia para quem tem Solicitações", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByText(/Artroscopia de joelho/));

    expect(push).toHaveBeenCalledWith("/solicitacao/sc-1");
  });

  /**
   * Grupo 2 do mapa: `handleDelete`/`handleChangeStatus` não tinham `.catch`
   * — um 403 (ou qualquer erro) deixava o modal travado sem mensagem. Agora
   * mostram um toast de erro em vez de falhar silenciosamente.
   */
  it("mostra um toast de erro quando excluir a consulta falha", async () => {
    // Sem mensagem no erro: `getApiErrorMessage` cai no fallback do handler.
    mocked(appointmentService.delete).mockRejectedValue({});
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByText("Retorno"));
    await user.click(await screen.findByRole("button", { name: /Excluir/i }));

    expect(
      await screen.findByText(/Não foi possível excluir a consulta/i),
    ).toBeInTheDocument();
  });
});
