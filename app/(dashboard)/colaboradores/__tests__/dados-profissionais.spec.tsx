import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Tela do colaborador (`assistente/[id]`) — dados profissionais de quem já é
 * profissional de saúde:
 * - apagar número/UF de um não médico precisa apagar no servidor (antes ia
 *   `undefined`, que o backend lê como "não mexer");
 * - trocar o conselho recarrega o colaborador (o subtítulo e o resto da tela
 *   leem o `doctorProfile` salvo);
 * - o subtítulo não chama de "Médico" quem não é CRM;
 * - salvar invalida a lista de médicos em cache (wizard de SC, agenda).
 */

const { getById, updateProfile, update, updateDoctorProfile } = vi.hoisted(
  () => ({
    getById: vi.fn(),
    updateProfile: vi.fn(),
    update: vi.fn(),
    updateDoctorProfile: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: "colab-1" }),
}));

vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: { getById, updateProfile, update },
}));
vi.mock("@/services/user.service", () => ({
  userService: { updateDoctorProfile },
}));
vi.mock("@/services/upload.service", () => ({
  uploadService: { uploadSingle: vi.fn() },
}));
vi.mock("@/services/patient.service", () => ({
  patientService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getAll: vi.fn().mockResolvedValue({ records: [] }),
  },
  STATUS_NUMBER_TO_STRING: {},
  STATUS_COLORS: {},
}));
vi.mock("@/hooks/useCepLookup", () => ({
  useCepLookup: () => ({ loading: false }),
}));
vi.mock("@/hooks/useDoctorHeaderEditor", () => ({
  useDoctorHeaderEditor: () => ({
    loadingHeader: false,
    savingHeader: false,
    currentHeader: null,
    headerLogoInputRef: { current: null },
  }),
}));
vi.mock("@/components/colaboradores/DoctorAccessSection", () => ({
  DoctorAccessSection: () => null,
}));
vi.mock("@/components/colaboradores/CollaboratorActionsSection", () => ({
  CollaboratorActionsSection: () => null,
}));
vi.mock("@/components/availability/ScheduleWeekEditor", () => ({
  ScheduleWeekEditor: () => null,
}));
vi.mock("@/components/shared/DoctorHeaderEditor", () => ({
  DoctorHeaderEditor: () => null,
}));

import AssistenteDetalhePage from "../assistente/[id]/page";

function colaborador(doctorProfile: Record<string, unknown>) {
  return {
    id: "colab-1",
    name: "Ana Souza",
    email: "ana@clinica.com",
    phone: "21999998888",
    status: "active",
    isDoctor: true,
    grantedPermissions: [],
    doctorProfile: { id: "dp-1", ...doctorProfile },
  };
}

let queryClient: QueryClient;

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AssistenteDetalhePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  updateProfile.mockResolvedValue({});
  update.mockResolvedValue({});
  updateDoctorProfile.mockResolvedValue({});
});

describe("Colaborador — dados profissionais", () => {
  it("campo Conselho é acessível pelo label", async () => {
    getById.mockResolvedValue(
      colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
    );
    renderPage();

    expect(await screen.findByLabelText("Conselho")).toHaveValue("CRN");
  });

  it("subtítulo usa a área do conselho, não 'Médico', para não médico", async () => {
    getById.mockResolvedValue(colaborador({ council: "CRN", crm: "4567" }));
    renderPage();

    await screen.findByLabelText("Conselho");
    expect(screen.getAllByText("Nutrição").length).toBeGreaterThan(0);
    expect(screen.queryByText("Médico")).toBeNull();
  });

  it("apagar número e UF de não médico envia string vazia", async () => {
    getById.mockResolvedValue(
      colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
    );
    renderPage();

    fireEvent.change(await screen.findByDisplayValue("4567"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/UF do conselho/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getAllByText("Salvar alterações")[0]);

    await waitFor(() =>
      expect(updateDoctorProfile).toHaveBeenCalledWith("colab-1", {
        crm: "",
        crmState: "",
      }),
    );
  });

  it("trocar o conselho recarrega o colaborador e invalida a lista de médicos", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    getById.mockResolvedValueOnce(
      colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
    );
    getById.mockResolvedValueOnce(
      colaborador({ council: "CRP", crm: "4567", crmState: "RJ" }),
    );
    renderPage();

    fireEvent.change(await screen.findByLabelText("Conselho"), {
      target: { value: "CRP" },
    });
    fireEvent.click(screen.getAllByText("Salvar alterações")[0]);

    await waitFor(() =>
      expect(updateDoctorProfile).toHaveBeenCalledWith("colab-1", {
        council: "CRP",
      }),
    );
    await waitFor(() => expect(getById).toHaveBeenCalledTimes(2));
    expect(
      (await screen.findAllByText("Psicologia")).length,
    ).toBeGreaterThan(0);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["available-doctors"],
    });
  });

  it("CRM continua exigindo número", async () => {
    getById.mockResolvedValue(
      colaborador({ council: "CRM", crm: "12345", crmState: "RJ" }),
    );
    renderPage();

    fireEvent.change(await screen.findByDisplayValue("12345"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getAllByText("Salvar alterações")[0]);

    expect(
      await screen.findByText(/informe CRM e estado do CRM/),
    ).toBeInTheDocument();
    expect(updateDoctorProfile).not.toHaveBeenCalled();
  });
});
