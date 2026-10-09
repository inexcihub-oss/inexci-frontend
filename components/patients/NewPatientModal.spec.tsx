import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { arquivoDeImagem } from "./foto-paciente.fixtures";

vi.mock("@/services/patient.service", () => ({
  patientService: { create: vi.fn(), discardPhoto: vi.fn() },
}));

const uploadSingle = vi.hoisted(() => vi.fn());
vi.mock("@/services/upload.service", () => ({
  uploadService: { uploadSingle: (...a: unknown[]) => uploadSingle(...a) },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

const permissions: Permission[] = [Permission.ATENDIMENTO];
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

import { patientService } from "@/services/patient.service";
import { healthPlanService } from "@/services/health-plan.service";
import { NewPatientModal } from "./NewPatientModal";

function renderModal() {
  return render(
    <NewPatientModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
  );
}

async function abrirModalDeConvenio(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /convênio/i }));
  await user.click(
    await screen.findByRole("button", { name: /cadastrar novo convênio/i }),
  );
  await screen.findByPlaceholderText("Nome do convênio");
}

describe("NewPatientModal + cadastro de convênio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
  });

  it("não renderiza o formulário do convênio dentro do formulário do paciente", async () => {
    const user = userEvent.setup();
    renderModal();
    await abrirModalDeConvenio(user);

    expect(document.querySelectorAll("form form")).toHaveLength(0);
  });

  it("cria o convênio sem submeter o formulário de paciente", async () => {
    const user = userEvent.setup();
    vi.mocked(healthPlanService.create).mockResolvedValue({
      id: "hp-1",
      name: "Unimed QA",
    } as never);

    renderModal();
    await abrirModalDeConvenio(user);

    await user.type(
      screen.getByPlaceholderText("Nome do convênio"),
      "Unimed QA",
    );
    await user.click(
      screen.getByRole("button", { name: /adicionar convênio/i }),
    );

    await waitFor(() =>
      expect(healthPlanService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Unimed QA" }),
      ),
    );
    expect(patientService.create).not.toHaveBeenCalled();
    expect(screen.queryByText(/Corrija os campos/i)).not.toBeInTheDocument();
  });
});

describe("NewPatientModal — CPF opcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
    vi.mocked(patientService.create).mockResolvedValue({
      id: "p-1",
      name: "Ana Souza",
    } as never);
  });

  it("cria o paciente sem CPF, sem mandar o campo", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(
      screen.getByRole("button", { name: /adicionar paciente/i }),
    );

    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(vi.mocked(patientService.create).mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: "Ana Souza", cpf: undefined }),
    );
  });

  it("continua validando o CPF quando ele é informado", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.type(screen.getByPlaceholderText("123.456.789-00"), "1234");
    await user.click(
      screen.getByRole("button", { name: /adicionar paciente/i }),
    );

    expect(
      (await screen.findAllByText(/CPF deve ter 11 dígitos/i)).length,
    ).toBeGreaterThan(0);
    expect(patientService.create).not.toHaveBeenCalled();
  });

  it("não marca o CPF como obrigatório", () => {
    renderModal();

    expect(screen.getByPlaceholderText("123.456.789-00")).not.toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByText("CPF (opcional)")).toBeInTheDocument();
  });
});

describe("NewPatientModal — telefone secundário", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
    vi.mocked(patientService.create).mockResolvedValue({
      id: "p-1",
      name: "Ana Souza",
    } as never);
  });

  it("mascara e envia o telefone secundário só com dígitos", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    const campo = screen.getByPlaceholderText("Fixo ou recado");
    await user.type(campo, "2422334455");
    expect(campo).toHaveValue("(24) 2233-4455");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));

    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(vi.mocked(patientService.create).mock.calls[0][0]).toEqual(
      expect.objectContaining({ secondaryPhone: "2422334455" }),
    );
  });

  it("vazio não manda o campo", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));

    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(
      vi.mocked(patientService.create).mock.calls[0][0].secondaryPhone,
    ).toBeUndefined();
  });

  it("valida como o telefone principal (DDD + 8 ou 9 dígitos)", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.type(
      screen.getByPlaceholderText("Fixo ou recado"),
      "2422",
    );
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));

    expect(
      (await screen.findAllByText(/Informe um telefone válido com DDD/i))
        .length,
    ).toBeGreaterThan(0);
    expect(patientService.create).not.toHaveBeenCalled();
  });
});

describe("NewPatientModal — erro não sobrevive ao fechamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
  });

  it("fechado pelo pai (isOpen=false) e reaberto, o erro anterior some", async () => {
    vi.mocked(patientService.create).mockRejectedValue({
      response: { data: { message: "Tipo de arquivo inválido" } },
    });
    const user = userEvent.setup();
    const props = { onClose: vi.fn(), onSuccess: vi.fn() };
    const { rerender } = render(<NewPatientModal isOpen {...props} />);

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    expect(await screen.findByText("Tipo de arquivo inválido")).toBeInTheDocument();

    rerender(<NewPatientModal isOpen={false} {...props} />);
    rerender(<NewPatientModal isOpen {...props} />);
    expect(screen.queryByText("Tipo de arquivo inválido")).toBeNull();
  });

  it("fechado pelo X e reaberto, o erro anterior some", async () => {
    vi.mocked(patientService.create).mockRejectedValue({
      response: { data: { message: "Tipo de arquivo inválido" } },
    });
    const user = userEvent.setup();
    const props = { onClose: vi.fn(), onSuccess: vi.fn() };
    const { rerender } = render(<NewPatientModal isOpen {...props} />);

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    await screen.findByText("Tipo de arquivo inválido");
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(props.onClose).toHaveBeenCalled();

    rerender(<NewPatientModal isOpen={false} {...props} />);
    rerender(<NewPatientModal isOpen {...props} />);
    expect(screen.queryByText("Tipo de arquivo inválido")).toBeNull();
  });
});

describe("NewPatientModal — foto no cadastro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
    vi.mocked(patientService.create).mockResolvedValue({ id: "p-1", name: "Ana" } as never);
    URL.createObjectURL = vi.fn(() => "blob:previa");
    URL.revokeObjectURL = vi.fn();
  });

  const foto = () => arquivoDeImagem("ana.png", "image/png");

  it("envia a foto antes e cria o paciente já com o caminho", async () => {
    uploadSingle.mockResolvedValue({ data: { path: "patient-photos/o/ana.webp", url: "u" } });
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));

    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(uploadSingle).toHaveBeenCalledWith(expect.any(File), "patient-photos");
    expect(vi.mocked(patientService.create).mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: "Ana Souza", photoPath: "patient-photos/o/ana.webp" }),
    );
  });

  it("se a foto não sobe, não cria o paciente e explica", async () => {
    uploadSingle.mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));

    expect(await screen.findByText(/Não foi possível enviar a foto/)).toBeInTheDocument();
    expect(patientService.create).not.toHaveBeenCalled();
  });

  it("cadastro falhou: a nova tentativa reaproveita a foto já enviada", async () => {
    uploadSingle.mockResolvedValue({ data: { path: "patient-photos/o/ana.webp", url: "u" } });
    vi.mocked(patientService.create)
      .mockRejectedValueOnce({ response: { data: { message: "CPF já cadastrado" } } })
      .mockResolvedValueOnce({ id: "p-1", name: "Ana" } as never);
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    expect(await screen.findByText("CPF já cadastrado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    await waitFor(() => expect(patientService.create).toHaveBeenCalledTimes(2));
    expect(uploadSingle).toHaveBeenCalledTimes(1);
    expect(vi.mocked(patientService.create).mock.calls[1][0]).toEqual(
      expect.objectContaining({ photoPath: "patient-photos/o/ana.webp" }),
    );
    expect(patientService.discardPhoto).not.toHaveBeenCalled();
  });

  it("trocar a foto depois da falha envia a nova", async () => {
    uploadSingle
      .mockResolvedValueOnce({ data: { path: "patient-photos/o/1.webp", url: "u" } })
      .mockResolvedValueOnce({ data: { path: "patient-photos/o/2.webp", url: "u" } });
    vi.mocked(patientService.create)
      .mockRejectedValueOnce({ response: { data: { message: "Falhou" } } })
      .mockResolvedValueOnce({ id: "p-1", name: "Ana" } as never);
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    expect(await screen.findByText("Falhou")).toBeInTheDocument();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    await waitFor(() => expect(patientService.create).toHaveBeenCalledTimes(2));
    expect(uploadSingle).toHaveBeenCalledTimes(2);
    expect(vi.mocked(patientService.create).mock.calls[1][0]).toEqual(
      expect.objectContaining({ photoPath: "patient-photos/o/2.webp" }),
    );
    expect(patientService.discardPhoto).toHaveBeenCalledTimes(1);
    expect(patientService.discardPhoto).toHaveBeenCalledWith("patient-photos/o/1.webp");
  });

  it("cadastro falhou e o modal foi fechado: descarta a foto já enviada", async () => {
    uploadSingle.mockResolvedValue({ data: { path: "patient-photos/o/ana.webp", url: "u" } });
    vi.mocked(patientService.create).mockRejectedValueOnce({
      response: { data: { message: "CPF já cadastrado" } },
    });
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    expect(await screen.findByText("CPF já cadastrado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(patientService.discardPhoto).toHaveBeenCalledWith("patient-photos/o/ana.webp");
  });

  it("foto removida depois da falha: o cadastro sem foto descarta a enviada", async () => {
    uploadSingle.mockResolvedValue({ data: { path: "patient-photos/o/ana.webp", url: "u" } });
    vi.mocked(patientService.create)
      .mockRejectedValueOnce({ response: { data: { message: "Falhou" } } })
      .mockResolvedValueOnce({ id: "p-1", name: "Ana" } as never);
    const user = userEvent.setup();
    renderModal();

    await user.upload(screen.getByTestId("new-patient-photo-input"), foto());
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    expect(await screen.findByText("Falhou")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remover/ }));
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    await waitFor(() => expect(patientService.create).toHaveBeenCalledTimes(2));
    expect(vi.mocked(patientService.create).mock.calls[1][0]).not.toHaveProperty("photoPath");
    expect(patientService.discardPhoto).toHaveBeenCalledWith("patient-photos/o/ana.webp");
  });

  it("sem foto não envia nada", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: /adicionar paciente/i }));
    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(uploadSingle).not.toHaveBeenCalled();
    expect(vi.mocked(patientService.create).mock.calls[0][0]).not.toHaveProperty("photoPath");
  });
});

describe("NewPatientModal — acessibilidade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
  });

  it("é um dialog nomeado pelo título", async () => {
    renderModal();
    expect(
      await screen.findByRole("dialog", { name: "Novo paciente" }),
    ).toHaveAttribute("aria-modal", "true");
  });

  it("Esc fecha o modal sem deixar o evento chegar ao modal de baixo", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const deBaixo = vi.fn();
    document.addEventListener("keydown", deBaixo);
    try {
      render(<NewPatientModal isOpen onClose={onClose} onSuccess={vi.fn()} />);
      await user.click(await screen.findByPlaceholderText("Nome completo"));
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(deBaixo).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", deBaixo);
    }
  });
});

describe("NewPatientModal — nomes acessíveis", () => {
  it("liga Data de nascimento e Gênero aos seus labels", () => {
    renderModal();
    expect(screen.getByLabelText(/Data de nascimento/)).toHaveAttribute(
      "placeholder",
      "DD/MM/AAAA",
    );
    expect(
      screen.getByRole("combobox", { name: /Gênero/ }),
    ).toBeInTheDocument();
  });
});
