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

/**
 * Digita um nome que não existe no catálogo e clica em criar.
 *
 * Usa `fireEvent.change` em vez de `userEvent.type`: onze `keydown`
 * sequenciais deixavam o teste na fronteira do timeout de 1s do `findBy` e ele
 * falhava um terço das vezes sob a suíte cheia. O que importa aqui é o valor
 * final do campo, não a digitação tecla a tecla.
 */
async function criarProcedimento() {
  fireEvent.change(
    screen.getByPlaceholderText("Buscar ou criar procedimento..."),
    { target: { value: "Artroscopia" } },
  );

  // "Criar "Artroscopia"" (opção do dropdown), não "Criar modelo" (submit).
  fireEvent.click(
    await screen.findByRole("button", { name: /Criar\s+"Artroscopia"/i }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAll.mockResolvedValue([]);
  onboardingMockState.emTour = false;
});

/**
 * O catálogo de procedimentos é transversal: `POST /procedures` herda o
 * `@RequireAnyArea()` da classe, então o médico e o colaborador criam o
 * procedimento que falta sem passar pelo admin.
 *
 * O erro precisa aparecer. Este `catch` era um `// silently fail`: o clique
 * não fazia nada e não dizia nada, e um nome duplicado ficava indistinguível
 * de um botão morto.
 */
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
    // `getApiErrorMessage` só lê o corpo de um `AxiosError` de verdade — um
    // objeto solto com `.response` cairia no texto genérico e o teste passaria
    // sem provar nada.
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
