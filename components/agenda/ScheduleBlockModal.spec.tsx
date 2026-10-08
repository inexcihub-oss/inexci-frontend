import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const service = vi.hoisted(() => ({
  createBlock: vi.fn(),
  updateBlock: vi.fn(),
  deleteBlock: vi.fn(),
}));
vi.mock("@/services/availability.service", () => ({
  availabilityService: service,
}));

import { ScheduleBlockModal } from "./ScheduleBlockModal";

const doctors = [
  { id: "d1", name: "Fabio Segall" },
  { id: "d2", name: "Ana Nutri" },
];

function abrir(props: Partial<Parameters<typeof ScheduleBlockModal>[0]> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <ScheduleBlockModal
      isOpen
      onClose={onClose}
      onSaved={onSaved}
      doctors={doctors}
      defaultDate="2026-10-05"
      {...props}
    />,
  );
  return { onSaved, onClose };
}

describe("ScheduleBlockModal (MIG-05)", () => {
  beforeEach(() => {
    Object.values(service).forEach((f) => f.mockReset());
    service.createBlock.mockResolvedValue({});
    service.updateBlock.mockResolvedValue({});
    service.deleteBlock.mockResolvedValue(undefined);
  });

  it("bloqueia um período de um profissional", async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = abrir();
    await user.selectOptions(screen.getByLabelText("Profissional"), "d1");
    await user.clear(screen.getByLabelText("De"));
    await user.type(screen.getByLabelText("De"), "14:00");
    await user.clear(screen.getByLabelText("Até"));
    await user.type(screen.getByLabelText("Até"), "18:00");
    await user.type(screen.getByLabelText("Motivo"), "Congresso");
    await user.click(screen.getByRole("button", { name: "Bloquear" }));

    await waitFor(() =>
      expect(service.createBlock).toHaveBeenCalledWith({
        doctorId: "d1",
        clinicId: null,
        startsAt: new Date(2026, 9, 5, 14, 0).toISOString(),
        endsAt: new Date(2026, 9, 5, 18, 0).toISOString(),
        allDay: false,
        reason: "Congresso",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith("Horário bloqueado.");
    expect(onClose).toHaveBeenCalled();
  });

  it("dia inteiro da clínica toda vai da meia-noite à meia-noite seguinte", async () => {
    const user = userEvent.setup();
    abrir({ podeClinicaToda: true });
    await user.click(screen.getByLabelText("Dia inteiro"));
    expect(screen.queryByLabelText("De")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() =>
      expect(service.createBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: null,
          allDay: true,
          startsAt: new Date(2026, 9, 5, 0, 0).toISOString(),
          endsAt: new Date(2026, 9, 6, 0, 0).toISOString(),
          reason: null,
        }),
      ),
    );
  });

  it("início depois do fim não chama a API", async () => {
    const user = userEvent.setup();
    abrir({ podeClinicaToda: true });
    await user.clear(screen.getByLabelText("Até"));
    await user.type(screen.getByLabelText("Até"), "07:00");
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O início deve ser antes do fim.");
    expect(service.createBlock).not.toHaveBeenCalled();
  });

  it("edita e remove um bloqueio existente", async () => {
    const user = userEvent.setup();
    const block = {
      id: "b1",
      doctorId: "d2",
      clinicId: null,
      startsAt: new Date(2026, 9, 5, 9, 0).toISOString(),
      endsAt: new Date(2026, 9, 5, 11, 0).toISOString(),
      allDay: false,
      reason: "Reunião",
    };
    const { onSaved } = abrir({ block });
    expect(screen.getByLabelText("Profissional")).toHaveValue("d2");
    expect(screen.getByLabelText("De")).toHaveValue("09:00");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(service.updateBlock).toHaveBeenCalledWith("b1", expect.objectContaining({ reason: "Reunião" })),
    );

    await user.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(service.deleteBlock).toHaveBeenCalledWith("b1"));
    expect(onSaved).toHaveBeenLastCalledWith("Bloqueio removido.");
  });

  it("desmarcar 'Dia inteiro' de um bloqueio de dia inteiro preenche 08:00–12:00", async () => {
    const user = userEvent.setup();
    const block = {
      id: "b-dia",
      doctorId: "d1",
      clinicId: null,
      startsAt: new Date(2026, 9, 5, 0, 0).toISOString(),
      endsAt: new Date(2026, 9, 6, 0, 0).toISOString(),
      allDay: true,
      reason: "Férias",
    };
    abrir({ block });
    expect(screen.getByLabelText("Dia inteiro")).toBeChecked();

    await user.click(screen.getByLabelText("Dia inteiro"));

    expect(screen.getByLabelText("De")).toHaveValue("08:00");
    expect(screen.getByLabelText("Até")).toHaveValue("12:00");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(service.updateBlock).toHaveBeenCalledWith(
        "b-dia",
        expect.objectContaining({
          allDay: false,
          startsAt: new Date(2026, 9, 5, 8, 0).toISOString(),
          endsAt: new Date(2026, 9, 5, 12, 0).toISOString(),
        }),
      ),
    );
  });

  it("mostra o erro da API", async () => {
    service.createBlock.mockRejectedValue({});
    const user = userEvent.setup();
    abrir({ podeClinicaToda: true });
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o bloqueio.",
    );
  });

  it("lista de profissionais instável (query falhando) não apaga o que foi digitado", async () => {
    const user = userEvent.setup();
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      defaultDate: "2026-10-05",
    };
    const { rerender } = render(<ScheduleBlockModal {...props} doctors={[]} />);
    await user.type(screen.getByLabelText("Motivo"), "Férias");
    await user.click(screen.getByLabelText("Dia inteiro"));

    // Como `data: doctors = []`: array novo a cada render.
    rerender(<ScheduleBlockModal {...props} doctors={[]} />);
    rerender(<ScheduleBlockModal {...props} doctors={[]} />);

    expect(screen.getByLabelText("Motivo")).toHaveValue("Férias");
    expect(screen.getByLabelText("Dia inteiro")).toBeChecked();
  });

  it("com um profissional só, ele já vem escolhido quando a lista chega", async () => {
    const user = userEvent.setup();
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      defaultDate: "2026-10-05",
    };
    const { rerender } = render(<ScheduleBlockModal {...props} doctors={[]} />);
    await user.type(screen.getByLabelText("Motivo"), "Congresso");
    rerender(<ScheduleBlockModal {...props} doctors={[doctors[0]]} />);
    expect(screen.getByLabelText("Profissional")).toHaveValue("d1");
    expect(screen.getByLabelText("Motivo")).toHaveValue("Congresso");
  });

  describe("bloqueio de toda a clínica só com Administração", () => {
    const blocoClinica = {
      id: "bc",
      doctorId: null,
      clinicId: null,
      startsAt: new Date(2026, 9, 5, 9, 0).toISOString(),
      endsAt: new Date(2026, 9, 5, 11, 0).toISOString(),
      allDay: false,
      reason: "Reforma",
    };

    it("sem Administração, 'Toda a clínica' não aparece e é preciso escolher o profissional", async () => {
      const user = userEvent.setup();
      abrir({ podeClinicaToda: false });
      expect(screen.queryByRole("option", { name: "Toda a clínica" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "Bloquear" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Escolha o profissional.");
      expect(service.createBlock).not.toHaveBeenCalled();
    });

    it("com Administração, a opção aparece", () => {
      abrir({ podeClinicaToda: true });
      expect(screen.getByRole("option", { name: "Toda a clínica" })).toBeInTheDocument();
    });

    it("sem Administração, bloqueio da clínica abre só para leitura", () => {
      abrir({ block: blocoClinica, podeClinicaToda: false });
      expect(screen.getByLabelText("Motivo")).toHaveValue("Reforma");
      expect(screen.getByLabelText("Motivo")).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Remover" })).toBeNull();
      expect(screen.getByText(/só administradores da conta/)).toBeInTheDocument();
    });

    it("com Administração, edita e remove o bloqueio da clínica", async () => {
      const user = userEvent.setup();
      abrir({ block: blocoClinica, podeClinicaToda: true });
      await user.click(screen.getByRole("button", { name: "Salvar" }));
      await waitFor(() =>
        expect(service.updateBlock).toHaveBeenCalledWith(
          "bc",
          expect.objectContaining({ doctorId: null }),
        ),
      );
      await user.click(screen.getByRole("button", { name: "Remover" }));
      await waitFor(() => expect(service.deleteBlock).toHaveBeenCalledWith("bc"));
    });
  });
});

describe("ScheduleBlockModal — clínica do bloqueio", () => {
  const clinics = [
    { id: "c1", name: "Clínica Centro" },
    { id: "c2", name: "Clínica Barra" },
  ];

  beforeEach(() => {
    Object.values(service).forEach((f) => f.mockReset());
    service.createBlock.mockResolvedValue({});
    service.updateBlock.mockResolvedValue({});
  });

  it("lista as clínicas da conta, com 'Todas as clínicas' como padrão", () => {
    abrir({ clinics });
    const select = screen.getByLabelText("Clínica") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(screen.getByRole("option", { name: "Todas as clínicas" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Clínica Barra" })).toBeInTheDocument();
  });

  it("bloqueia o profissional só numa clínica", async () => {
    const user = userEvent.setup();
    abrir({ clinics });
    await user.selectOptions(screen.getByLabelText("Profissional"), "d1");
    await user.selectOptions(screen.getByLabelText("Clínica"), "c2");
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() =>
      expect(service.createBlock).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: "d1", clinicId: "c2" }),
      ),
    );
  });

  it("sem Administração, clínica sem profissional continua exigindo o profissional", async () => {
    const user = userEvent.setup();
    abrir({ clinics });
    await user.selectOptions(screen.getByLabelText("Clínica"), "c1");
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha o profissional.");
    expect(service.createBlock).not.toHaveBeenCalled();
  });

  it("com Administração, bloqueia a clínica inteira (todos os profissionais dela)", async () => {
    const user = userEvent.setup();
    abrir({ clinics, podeClinicaToda: true });
    await user.selectOptions(screen.getByLabelText("Clínica"), "c1");
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() =>
      expect(service.createBlock).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: null, clinicId: "c1" }),
      ),
    );
  });

  it("editar preserva a clínica do bloqueio, mesmo fora da lista", async () => {
    const user = userEvent.setup();
    abrir({
      clinics,
      block: {
        id: "b9",
        doctorId: "d1",
        clinicId: "c-removida",
        startsAt: new Date(2026, 9, 5, 9, 0).toISOString(),
        endsAt: new Date(2026, 9, 5, 10, 0).toISOString(),
        allDay: false,
        reason: null,
      },
    });
    expect((screen.getByLabelText("Clínica") as HTMLSelectElement).value).toBe("c-removida");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(service.updateBlock).toHaveBeenCalledWith(
        "b9",
        expect.objectContaining({ clinicId: "c-removida" }),
      ),
    );
  });
});
