import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { NewProcedureModelModal } from "./NewProcedureModelModal";

const { getAll, create } = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/services/procedure.service", () => ({
  procedureService: { getAll, create },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

function renderModal() {
  return render(
    <NewProcedureModelModal
      isOpen
      onClose={vi.fn()}
      onSubmit={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

async function criarProcedimento() {
  fireEvent.change(
    screen.getByPlaceholderText("Buscar ou criar procedimento..."),
    { target: { value: "Artroscopia" } },
  );

  fireEvent.click(
    await screen.findByRole("button", { name: /Criar\s+“Artroscopia”/i }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAll.mockResolvedValue([]);
  onboardingMockState.emTour = false;
});

describe("NewProcedureModelModal — criação inline de procedimento", () => {
  it("adiciona o procedimento criado e não mostra erro", async () => {
    create.mockResolvedValue({ id: "proc-1", name: "Artroscopia" });
    renderModal();

    await criarProcedimento();

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ name: "Artroscopia" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra a mensagem do backend quando a criação falha", async () => {
    const erro = new AxiosError("Request failed");
    erro.response = {
      data: { message: "Procedimento já cadastrado." },
    } as never;
    create.mockRejectedValue(erro);
    renderModal();

    await criarProcedimento();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Procedimento já cadastrado.",
    );
  });
});

describe("NewProcedureModelModal — guard emTour", () => {
  it("desabilita o botão de criar modelo durante o tour", () => {
    onboardingMockState.emTour = true;
    renderModal();
    const input = screen.getByPlaceholderText("Ex: Artroplastia padrão Bradesco");
    fireEvent.change(input, { target: { value: "Teste" } });
    expect(
      screen.getByRole("button", { name: /Criar modelo/i }),
    ).toBeDisabled();
  });

  it("mantém o botão habilitado fora do tour", () => {
    renderModal();
    const input = screen.getByPlaceholderText("Ex: Artroplastia padrão Bradesco");
    fireEvent.change(input, { target: { value: "Teste" } });
    expect(
      screen.getByRole("button", { name: /Criar modelo/i }),
    ).toBeEnabled();
  });
});
