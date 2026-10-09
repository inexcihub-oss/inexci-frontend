import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getById, updateProfile, update, updateDoctorProfile } = vi.hoisted(
  () => ({
    getById: vi.fn(),
    updateProfile: vi.fn(),
    update: vi.fn(),
    updateDoctorProfile: vi.fn(),
  }),
);

const authState = vi.hoisted(() => ({
  user: { id: "dono-1" } as { id: string } | null,
  isAccountOwner: true,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

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
  authState.user = { id: "dono-1" };
  authState.isAccountOwner = true;
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
    expect((await screen.findAllByText("Psicologia")).length).toBeGreaterThan(
      0,
    );
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

  describe("admin delegado editando a si mesmo", () => {
    beforeEach(() => {
      authState.user = { id: "colab-1" };
      authState.isAccountOwner = false;
    });

    it("não troca o próprio conselho nem o vínculo profissional", async () => {
      getById.mockResolvedValue(
        colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
      );
      renderPage();

      expect(await screen.findByLabelText("Conselho")).toBeDisabled();
      expect(
        screen.getByRole("checkbox", { name: /É profissional de saúde/ }),
      ).toBeDisabled();
      expect(
        screen.getByText(/Só o dono da conta ou outro administrador/),
      ).toBeInTheDocument();
    });

    it("segue editando número e UF do próprio registro", async () => {
      getById.mockResolvedValue(
        colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
      );
      renderPage();

      const numero = await screen.findByDisplayValue("4567");
      expect(numero).toBeEnabled();
      fireEvent.change(numero, { target: { value: "9999" } });
      fireEvent.click(screen.getAllByText("Salvar alterações")[0]);

      await waitFor(() =>
        expect(updateDoctorProfile).toHaveBeenCalledWith("colab-1", {
          crm: "9999",
        }),
      );
    });
  });

  it("o dono edita o conselho de outro colaborador", async () => {
    getById.mockResolvedValue(
      colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
    );
    renderPage();

    expect(await screen.findByLabelText("Conselho")).toBeEnabled();
    expect(
      screen.getByRole("checkbox", { name: /É profissional de saúde/ }),
    ).toBeEnabled();
  });

  it("grava o perfil profissional antes do perfil básico e do colaborador", async () => {
    getById.mockResolvedValue(
      colaborador({ council: "CRN", crm: "4567", crmState: "RJ" }),
    );
    updateDoctorProfile.mockRejectedValueOnce({
      response: { data: { message: "Proibido" } },
    });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Conselho"), {
      target: { value: "CRP" },
    });
    fireEvent.change(screen.getByDisplayValue("Ana Souza"), {
      target: { value: "Ana Souza Lima" },
    });
    fireEvent.click(screen.getAllByText("Salvar alterações")[0]);

    expect(await screen.findByText("Proibido")).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
