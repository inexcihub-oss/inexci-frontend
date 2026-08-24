import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSurgeryRequestWizard } from "./CreateSurgeryRequestWizard";

vi.mock("@/hooks/useSwipeToClose", () => ({
  useSwipeToClose: () => ({
    dragY: 0,
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ can: () => true, permissions: [] }),
}));

// A referência precisa ser estável: o wizard auto-seleciona o médico único
// num efeito que depende do array, e um literal novo a cada render vira loop
// infinito (ver mesmo gotcha em __tests__/CreateSurgeryRequestWizard.template.spec.tsx
// e components/agenda/NewAppointmentModal.spec.tsx). Por isso o array vive
// dentro do factory, que só roda uma vez.
vi.mock("@/hooks/useAvailableDoctors", () => {
  const stableData = [{ id: "doctor-1", name: "Dra. Ana" }];
  return {
    useAvailableDoctors: () => ({
      data: stableData,
      isLoading: false,
    }),
  };
});

vi.mock("./wizard-steps/SelectionContents", () => ({
  ProcedureSelectionContent: ({
    onSelect,
  }: {
    onSelect: (p: { id: string; name: string }) => void;
  }) => (
    <button onClick={() => onSelect({ id: "proc-1", name: "Artroscopia" })}>
      escolher procedimento
    </button>
  ),
  PatientSelectionContent: ({
    onSelect,
  }: {
    onSelect: (p: { id: string; name: string }) => void;
  }) => (
    <button onClick={() => onSelect({ id: "pac-1", name: "Paciente Teste" })}>
      escolher paciente
    </button>
  ),
  HospitalSelectionContent: () => <div data-testid="painel-hospital" />,
  HealthPlanSelectionContent: () => <div data-testid="painel-convenio" />,
  DoctorSelectionContent: ({
    onSelect,
    availableDoctors,
  }: {
    onSelect: (d: { id: string; name: string }) => void;
    availableDoctors: { id: string; name: string }[];
  }) => (
    <button onClick={() => onSelect(availableDoctors[0])}>
      escolher médico
    </button>
  ),
  TemplateSelectionContent: () => <div data-testid="painel-modelo" />,
}));

vi.mock("./CreateProcedureModal", () => ({
  CreateProcedureModal: () => null,
}));
vi.mock("./CreatePatientModal", () => ({ CreatePatientModal: () => null }));
vi.mock("./CreateHospitalModal", () => ({ CreateHospitalModal: () => null }));
vi.mock("./CreateHealthPlanModal", () => ({
  CreateHealthPlanModal: () => null,
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getTemplate: vi.fn(),
    createSimple: vi.fn().mockResolvedValue({ id: "sc-1" }),
    incrementTemplateUsage: vi.fn(),
  },
}));
vi.mock("@/services/opme.service", () => ({
  opmeService: { create: vi.fn() },
}));
vi.mock("@/services/tuss.service", () => ({
  tussService: { addProcedures: vi.fn() },
}));

const registeredActions = new Map<string, () => void>();
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: (id: string, fn: () => void) => {
    registeredActions.set(id, fn);
  },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

describe("CreateSurgeryRequestWizard — tour de onboarding", () => {
  beforeEach(() => {
    onboardingMockState.emTour = false;
    registeredActions.clear();
  });

  it("registra a ação que abre o painel de seleção de procedimento", () => {
    render(
      <CreateSurgeryRequestWizard
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(registeredActions.has("sc-abrir-selecao-procedimento")).toBe(
      true,
    );
    expect(
      screen.queryByText("escolher procedimento"),
    ).not.toBeInTheDocument();

    act(() => registeredActions.get("sc-abrir-selecao-procedimento")?.());

    expect(screen.getByText("escolher procedimento")).toBeInTheDocument();
  });

  it("mantém 'Nova solicitação' habilitada fora do tour com os três campos selecionados", async () => {
    const user = userEvent.setup();
    render(
      <CreateSurgeryRequestWizard
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Procedimento"));
    await user.click(screen.getByText("escolher procedimento"));
    await user.click(screen.getByText("escolher paciente"));

    expect(
      screen.getByRole("button", { name: /nova solicitação/i }),
    ).toBeEnabled();
  });

  it("desabilita 'Nova solicitação' durante o tour mesmo com os três campos selecionados", async () => {
    const user = userEvent.setup();
    onboardingMockState.emTour = true;
    render(
      <CreateSurgeryRequestWizard
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Procedimento"));
    await user.click(screen.getByText("escolher procedimento"));
    await user.click(screen.getByText("escolher paciente"));

    expect(
      screen.getByRole("button", { name: /nova solicitação/i }),
    ).toBeDisabled();
  });
});
