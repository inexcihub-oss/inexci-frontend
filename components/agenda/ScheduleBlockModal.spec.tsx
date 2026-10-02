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
    abrir();
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
    abrir();
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

  it("mostra o erro da API", async () => {
    service.createBlock.mockRejectedValue({});
    const user = userEvent.setup();
    abrir();
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o bloqueio.",
    );
  });
});
