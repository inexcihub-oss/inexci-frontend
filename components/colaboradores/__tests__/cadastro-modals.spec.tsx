import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { hospitalCreate, healthPlanCreate, clinicCreate } = vi.hoisted(() => ({
  hospitalCreate: vi.fn(),
  healthPlanCreate: vi.fn(),
  clinicCreate: vi.fn(),
}));

vi.mock("@/services/hospital.service", () => ({
  hospitalService: { create: hospitalCreate },
}));
vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { create: healthPlanCreate },
}));
vi.mock("@/services/clinic.service", () => ({
  clinicService: { create: clinicCreate },
}));

import { NewHospitalModal } from "../NewHospitalModal";
import { NewHealthPlanModal } from "../NewHealthPlanModal";
import { NewClinicModal } from "@/components/clinics/NewClinicModal";

const CENARIOS = [
  {
    nome: "hospital",
    Modal: NewHospitalModal,
    create: hospitalCreate,
    titulo: "Novo hospital",
    placeholder: "Nome do hospital",
    botao: "Adicionar hospital",
    emailPlaceholder: "hospital@mail.com",
  },
  {
    nome: "convênio",
    Modal: NewHealthPlanModal,
    create: healthPlanCreate,
    titulo: "Novo convênio",
    placeholder: "Nome do convênio",
    botao: "Adicionar convênio",
    emailPlaceholder: "convenio@mail.com",
  },
  {
    nome: "clínica",
    Modal: NewClinicModal,
    create: clinicCreate,
    titulo: "Nova clínica",
    placeholder: "Nome da clínica",
    botao: "Adicionar clínica",
    emailPlaceholder: "clinica@mail.com",
  },
] as const;

describe.each(CENARIOS)(
  "modal de cadastro — $nome",
  ({ Modal, create, titulo, placeholder, botao, emailPlaceholder }) => {
    beforeEach(() => vi.clearAllMocks());

    it("é um dialog nomeado pelo título", () => {
      render(<Modal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByRole("dialog", { name: titulo })).toBeInTheDocument();
    });

    it("não envia sem nome e mostra o erro do schema", async () => {
      const user = userEvent.setup();
      render(<Modal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: botao }));

      expect(create).not.toHaveBeenCalled();
      expect(await screen.findByRole("alert")).toHaveTextContent(/Informe o nome/);
    });

    it("rejeita e-mail inválido com a regra única de validators", async () => {
      const user = userEvent.setup();
      render(<Modal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

      await user.type(screen.getByPlaceholderText(placeholder), "Teste Ltda");
      await user.type(screen.getByPlaceholderText(emailPlaceholder), "a@b.c");
      await user.click(screen.getByRole("button", { name: botao }));

      expect(create).not.toHaveBeenCalled();
      expect(
        await screen.findByText("Informe um e-mail válido."),
      ).toBeInTheDocument();
    });

    it("cria com telefone só em dígitos e avisa o pai", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      create.mockResolvedValue({ id: "1" });
      render(<Modal isOpen onClose={onClose} onSuccess={onSuccess} />);

      await user.type(screen.getByPlaceholderText(placeholder), "  Teste Ltda ");
      await user.type(
        screen.getByPlaceholderText("(21) 98765-4321"),
        "21987654321",
      );
      await user.click(screen.getByRole("button", { name: botao }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Teste Ltda", phone: "21987654321" }),
      );
      expect(onClose).toHaveBeenCalled();
    });

    it("mostra a mensagem de erro quando a criação falha", async () => {
      const user = userEvent.setup();
      create.mockRejectedValue(new Error("Já existe um cadastro com esse nome"));
      render(<Modal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

      await user.type(screen.getByPlaceholderText(placeholder), "Teste Ltda");
      await user.click(screen.getByRole("button", { name: botao }));

      expect(
        await screen.findByText("Já existe um cadastro com esse nome"),
      ).toBeInTheDocument();
    });
  },
);
