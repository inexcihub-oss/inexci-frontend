import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";
import type { Procedure } from "@/services/procedure.service";
import type { PatientListItem } from "@/services/patient.service";
import type { Hospital } from "@/services/hospital.service";
import type { HealthPlan } from "@/services/health-plan.service";
import type { AvailableDoctor } from "@/types";
import type { SurgeryRequestTemplateSummary } from "@/services/surgery-request.service";
import { PRIORITY } from "@/types/surgery-request.types";
import { useCreateSurgeryRequestWizard } from "./useCreateSurgeryRequestWizard";

const getTemplate = vi.fn();
const createSimple = vi.fn();
const setHasOpme = vi.fn();
const incrementTemplateUsage = vi.fn();
const addProcedures = vi.fn();
const opmeCreate = vi.fn();

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getTemplate: (...args: unknown[]) => getTemplate(...args),
    createSimple: (...args: unknown[]) => createSimple(...args),
    setHasOpme: (...args: unknown[]) => setHasOpme(...args),
    incrementTemplateUsage: (...args: unknown[]) =>
      incrementTemplateUsage(...args),
  },
}));
vi.mock("@/services/tuss.service", () => ({
  tussService: {
    addProcedures: (...args: unknown[]) => addProcedures(...args),
  },
}));
vi.mock("@/services/opme.service", () => ({
  opmeService: { create: (...args: unknown[]) => opmeCreate(...args) },
}));

const doctorsState = vi.hoisted(() => ({
  data: [{ id: "doc-1", name: "Dra. Ana", status: "active" }] as unknown[],
}));
vi.mock("@/hooks/useAvailableDoctors", () => ({
  useAvailableDoctors: () => ({ data: doctorsState.data, isLoading: false }),
}));

const registeredActions = new Map<string, () => void>();
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: (id: string, fn: () => void) => {
    registeredActions.set(id, fn);
  },
}));

const procedure = { id: "proc-1", name: "Artroscopia" } as Procedure;
const patient = { id: "pac-1", name: "Paciente" } as PatientListItem;
const doctor = { id: "doc-2", name: "Dr. Beto" } as AvailableDoctor;
const healthPlan = { id: "plan-1", name: "Unimed" } as HealthPlan;
const hospital = { id: "hosp-1", name: "Central" } as Hospital;

function renderWizard(
  overrides: Partial<Parameters<typeof useCreateSurgeryRequestWizard>[0]> = {},
) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
  const view = renderHook(
    () =>
      useCreateSurgeryRequestWizard({
        isOpen: true,
        onClose,
        onSuccess,
        ...overrides,
      }),
    { wrapper },
  );
  return { ...view, onClose, onSuccess };
}

describe("useCreateSurgeryRequestWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredActions.clear();
    doctorsState.data = [{ id: "doc-1", name: "Dra. Ana", status: "active" }];
    createSimple.mockResolvedValue({ id: "sc-1" });
    incrementTemplateUsage.mockResolvedValue(undefined);
    setHasOpme.mockResolvedValue(undefined);
    addProcedures.mockResolvedValue(undefined);
    opmeCreate.mockResolvedValue(undefined);
  });

  it("seleciona o único médico disponível automaticamente", async () => {
    const { result } = renderWizard();

    await waitFor(() => expect(result.current.selectedDoctor?.id).toBe("doc-1"));
  });

  it("não pré-seleciona médico quando há mais de um", () => {
    doctorsState.data = [
      { id: "doc-1", name: "Dra. Ana", status: "active" },
      { id: "doc-2", name: "Dr. Beto", status: "active" },
    ];
    const { result } = renderWizard();

    expect(result.current.selectedDoctor).toBeNull();
    expect(result.current.availableDoctors).toHaveLength(2);
  });

  it("avança pelos painéis na ordem procedimento → paciente → médico → convênio → hospital", () => {
    const { result } = renderWizard();

    act(() => result.current.selectProcedure(procedure));
    expect(result.current.panel).toBe("patient-select");

    act(() => result.current.selectPatient(patient));
    expect(result.current.panel).toBe("doctor-select");

    act(() => result.current.selectDoctor(doctor));
    expect(result.current.panel).toBe("healthplan-select");

    act(() => result.current.selectHealthPlan(healthPlan));
    expect(result.current.panel).toBe("hospital-select");

    act(() => result.current.selectHospital(hospital));
    expect(result.current.panel).toBe("none");
    expect(result.current.canSubmit).toBe(true);
  });

  it("registra a ação do tour que abre a seleção de procedimento", () => {
    const { result } = renderWizard();

    act(() => registeredActions.get("sc-abrir-selecao-procedimento")?.());

    expect(result.current.panel).toBe("procedure-select");
  });

  it("acrescenta o item criado na lista registrada e o seleciona", () => {
    const { result } = renderWizard();
    const adder = vi.fn();

    act(() => result.current.registerPatientAdder(adder));
    act(() => result.current.patientCreated(patient));

    expect(adder).toHaveBeenCalledWith(patient);
    expect(result.current.selectedPatient).toEqual(patient);
    expect(result.current.panel).toBe("doctor-select");
  });

  it("limpa a cadeia quando o procedimento selecionado é excluído", () => {
    const { result } = renderWizard();

    act(() => result.current.selectProcedure(procedure));
    act(() => result.current.selectPatient(patient));
    act(() => result.current.procedureDeleted("outro"));
    expect(result.current.selectedPatient).toEqual(patient);

    act(() => result.current.procedureDeleted("proc-1"));
    expect(result.current.selectedProcedure).toBeNull();
    expect(result.current.selectedPatient).toBeNull();
    expect(result.current.selectedDoctor).toBeNull();
    expect(result.current.panel).toBe("procedure-select");
  });

  it("aplica o modelo inicial e abre a seleção de paciente", () => {
    const template = {
      id: "tpl-1",
      name: "Modelo",
      procedureId: "proc-9",
      procedureName: "Artrodese",
      hospitalId: "hosp-9",
      hospitalName: "Hospital Sul",
      healthPlanId: "plan-9",
      healthPlanName: "Bradesco",
      priority: PRIORITY.HIGH,
    } as SurgeryRequestTemplateSummary;

    const { result } = renderWizard({ initialTemplate: template });

    expect(result.current.activeTemplate?.id).toBe("tpl-1");
    expect(result.current.selectedProcedure?.name).toBe("Artrodese");
    expect(result.current.selectedHospital?.name).toBe("Hospital Sul");
    expect(result.current.selectedHealthPlan?.name).toBe("Bradesco");
    expect(result.current.priority).toBe(PRIORITY.HIGH);
    expect(result.current.panel).toBe("patient-select");
  });

  it("close zera o estado e chama onClose", () => {
    const { result, onClose } = renderWizard();

    act(() => result.current.selectProcedure(procedure));
    act(() => result.current.setPriority(PRIORITY.URGENT));
    act(() => result.current.close());

    expect(result.current.selectedProcedure).toBeNull();
    expect(result.current.priority).toBe(PRIORITY.LOW);
    expect(result.current.panel).toBe("none");
    expect(onClose).toHaveBeenCalled();
  });

  it("não envia sem procedimento, paciente e médico", async () => {
    doctorsState.data = [];
    const { result } = renderWizard();

    await act(() => result.current.submit());

    expect(createSimple).not.toHaveBeenCalled();
  });

  it("cria a solicitação com o payload selecionado e fecha", async () => {
    const { result, onClose, onSuccess } = renderWizard();

    await waitFor(() => expect(result.current.selectedDoctor).not.toBeNull());
    act(() => result.current.selectProcedure(procedure));
    act(() => result.current.selectPatient(patient));
    act(() => result.current.selectHealthPlan(healthPlan));
    act(() => result.current.setPriority(PRIORITY.MEDIUM));

    await act(() => result.current.submit());

    expect(createSimple).toHaveBeenCalledWith({
      procedureId: "proc-1",
      patientId: "pac-1",
      doctorId: "doc-1",
      healthPlanId: "plan-1",
      hospitalId: undefined,
      priority: PRIORITY.MEDIUM,
      requiredDocuments: undefined,
    });
    expect(getTemplate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("copia OPME e TUSS do modelo e marca has_opme", async () => {
    getTemplate.mockResolvedValue({
      templateData: {
        requiredDocuments: [{ type: "rg", name: "RG" }],
        opmeItems: [{ name: "Parafuso", quantity: 2 }],
        tussItems: [{ tussCode: "1.01", name: "Consulta", quantity: 1 }],
      },
    });
    const template = {
      id: "tpl-1",
      name: "Modelo",
    } as SurgeryRequestTemplateSummary;
    const { result } = renderWizard({ initialTemplate: template });

    await waitFor(() => expect(result.current.selectedDoctor).not.toBeNull());
    act(() => result.current.selectProcedure(procedure));
    act(() => result.current.selectPatient(patient));

    await act(() => result.current.submit());

    expect(createSimple).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredDocuments: [{ type: "rg", name: "RG" }],
      }),
    );
    expect(opmeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ surgeryRequestId: "sc-1", name: "Parafuso" }),
    );
    expect(setHasOpme).toHaveBeenCalledWith("sc-1", true);
    expect(addProcedures).toHaveBeenCalledWith({
      surgeryRequestId: "sc-1",
      procedures: [{ tussCode: "1.01", name: "Consulta", quantity: 1 }],
    });
    expect(incrementTemplateUsage).toHaveBeenCalledWith("tpl-1");
  });

  it("mantém o wizard aberto quando a criação falha", async () => {
    createSimple.mockRejectedValue(new Error("falhou"));
    const { result, onClose, onSuccess } = renderWizard();

    await waitFor(() => expect(result.current.selectedDoctor).not.toBeNull());
    act(() => result.current.selectProcedure(procedure));
    act(() => result.current.selectPatient(patient));

    await act(() => result.current.submit());

    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedProcedure).toEqual(procedure);
  });
});
