import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const service = vi.hoisted(() => ({
  getSchedules: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}));
vi.mock("@/services/availability.service", () => ({
  availabilityService: service,
}));
vi.mock("@/hooks/useClinics", () => ({
  useClinics: () => ({ data: [{ id: "c1", name: "Clínica Centro" }] }),
}));
vi.mock("@/hooks/useClinicRooms", () => ({
  useClinicRooms: (id: string | null) => ({
    data: id ? [{ id: "r1", clinicId: id, name: "Consultório 01", active: true }] : [],
  }),
}));

import { ScheduleWeekEditor } from "./ScheduleWeekEditor";

const periodo = {
  id: "g1",
  doctorId: "doc-1",
  clinicId: "c1",
  roomId: "r1",
  room: { id: "r1", name: "Consultório 01" },
  clinic: { id: "c1", name: "Clínica Centro" },
  weekday: 1,
  startTime: "08:00:00",
  endTime: "12:00:00",
  slotMinutes: 30,
  maxWalkIns: null,
  validFrom: null,
  validTo: "2026-12-31",
  active: true,
};

describe("ScheduleWeekEditor (MIG-05)", () => {
  beforeEach(() => {
    Object.values(service).forEach((f) => f.mockReset());
    service.getSchedules.mockResolvedValue([periodo]);
    service.createSchedule.mockResolvedValue({});
    service.updateSchedule.mockResolvedValue({});
    service.deleteSchedule.mockResolvedValue(undefined);
  });

  it("mostra a semana com os períodos e os dias sem atendimento", async () => {
    render(<ScheduleWeekEditor doctorId="doc-1" />);
    expect(await screen.findByText("08:00–12:00")).toBeInTheDocument();
    expect(service.getSchedules).toHaveBeenCalledWith("doc-1");
    expect(screen.getByText(/a cada 30 min · Consultório 01 · até 31\/12\/2026/)).toBeInTheDocument();
    expect(screen.getAllByText("Não atende")).toHaveLength(6);
  });

  it("adiciona período com clínica e sala", async () => {
    const user = userEvent.setup();
    render(<ScheduleWeekEditor doctorId="doc-1" />);
    await screen.findByText("08:00–12:00");

    await user.click(screen.getByRole("button", { name: /Adicionar período/ }));
    await user.selectOptions(screen.getByLabelText("Dia"), "3");
    await user.clear(screen.getByLabelText("Início"));
    await user.type(screen.getByLabelText("Início"), "14:00");
    await user.clear(screen.getByLabelText("Fim"));
    await user.type(screen.getByLabelText("Fim"), "18:00");
    await user.selectOptions(screen.getByLabelText("Intervalo"), "20");
    await user.selectOptions(screen.getByLabelText("Clínica (opcional)"), "c1");
    await user.selectOptions(screen.getByLabelText("Sala (opcional)"), "r1");
    await user.click(screen.getByRole("button", { name: "Salvar período" }));

    await waitFor(() =>
      expect(service.createSchedule).toHaveBeenCalledWith({
        doctorId: "doc-1",
        weekday: 3,
        startTime: "14:00",
        endTime: "18:00",
        slotMinutes: 20,
        clinicId: "c1",
        roomId: "r1",
        validFrom: null,
        validTo: null,
        maxWalkIns: null,
      }),
    );
  });

  it("recusa início depois do fim sem chamar a API", async () => {
    const user = userEvent.setup();
    render(<ScheduleWeekEditor doctorId="doc-1" />);
    await screen.findByText("08:00–12:00");
    await user.click(screen.getByRole("button", { name: /Adicionar período/ }));
    await user.clear(screen.getByLabelText("Fim"));
    await user.type(screen.getByLabelText("Fim"), "07:00");
    await user.click(screen.getByRole("button", { name: "Salvar período" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O início deve ser antes do fim.");
    expect(service.createSchedule).not.toHaveBeenCalled();
  });

  it("mostra a sobreposição recusada pela API", async () => {
    service.createSchedule.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Já existe um período de 08:00 às 12:00 nesse dia." } },
    });
    const user = userEvent.setup();
    render(<ScheduleWeekEditor doctorId="doc-1" />);
    await screen.findByText("08:00–12:00");
    await user.click(screen.getByRole("button", { name: /Adicionar período/ }));
    await user.click(screen.getByRole("button", { name: "Salvar período" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("edita, desativa e remove um período", async () => {
    const user = userEvent.setup();
    render(<ScheduleWeekEditor doctorId="doc-1" />);
    await screen.findByText("08:00–12:00");

    await user.click(screen.getByRole("button", { name: "Desativar" }));
    expect(service.updateSchedule).toHaveBeenCalledWith("g1", { active: false });

    await user.click(screen.getByRole("button", { name: "Editar Segunda 08:00" }));
    expect(screen.getByLabelText("Início")).toHaveValue("08:00");
    await user.click(screen.getByRole("button", { name: "Salvar período" }));
    await waitFor(() =>
      expect(service.updateSchedule).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ startTime: "08:00", roomId: "r1", validTo: "2026-12-31" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Remover Segunda 08:00" }));
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));
    await waitFor(() => expect(service.deleteSchedule).toHaveBeenCalledWith("g1"));
  });

  it("só leitura: sem botões de edição", async () => {
    render(<ScheduleWeekEditor doctorId="doc-1" canEdit={false} />);
    await screen.findByText("08:00–12:00");
    expect(screen.queryByRole("button", { name: /Adicionar período/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Desativar" })).toBeNull();
  });

  it("trocar de profissional descarta a grade atrasada do anterior", async () => {
    let soltarDoc1!: (v: unknown[]) => void;
    service.getSchedules.mockImplementation((id: string) =>
      id === "doc-1"
        ? new Promise((res) => {
            soltarDoc1 = res;
          })
        : Promise.resolve([{ ...periodo, id: "g2", doctorId: "doc-2", startTime: "14:00:00", endTime: "18:00:00" }]),
    );
    const { rerender } = render(<ScheduleWeekEditor doctorId="doc-1" />);
    rerender(<ScheduleWeekEditor doctorId="doc-2" />);
    expect(await screen.findByText("14:00–18:00")).toBeInTheDocument();

    soltarDoc1([periodo]);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("08:00–12:00")).toBeNull();
    expect(screen.getByText("14:00–18:00")).toBeInTheDocument();
  });

  it("erro de carga some quando a grade do próximo profissional carrega", async () => {
    service.getSchedules.mockRejectedValueOnce(new Error("rede"));
    const { rerender } = render(<ScheduleWeekEditor doctorId="doc-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rede");
    rerender(<ScheduleWeekEditor doctorId="doc-2" />);
    expect(await screen.findByText("08:00–12:00")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
