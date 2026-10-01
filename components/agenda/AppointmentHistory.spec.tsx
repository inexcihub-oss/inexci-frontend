import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import type { AppointmentActivity } from "@/services/appointment.service";

const service = vi.hoisted(() => ({
  listActivities: vi.fn(),
  addComment: vi.fn(),
}));
vi.mock("@/services/appointment.service", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("@/services/appointment.service")>();
  return {
    ...real,
    appointmentService: { ...real.appointmentService, ...service },
  };
});

import { AppointmentHistory } from "./AppointmentHistory";

function atividade(parcial: Partial<AppointmentActivity>): AppointmentActivity {
  return {
    id: Math.random().toString(36).slice(2),
    type: "system",
    fromStatus: null,
    toStatus: null,
    content: null,
    createdAt: "2026-07-29T12:00:00.000Z",
    user: null,
    ...parcial,
  };
}

function renderHistory(podeComentar = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AppointmentHistory appointmentId="a-1" podeComentar={podeComentar} />
    </QueryClientProvider>,
  );
}

describe("AppointmentHistory (MIG-04)", () => {
  beforeEach(() => {
    service.listActivities.mockReset();
    service.addComment.mockReset();
  });

  it("lista o histórico com quem fez e as transições de status com rótulo", async () => {
    service.listActivities.mockResolvedValue([
      atividade({
        type: "created",
        content: "Consulta agendada para 29/07 às 14:30",
        user: { id: "u-1", name: "Carla Secretária" },
      }),
      atividade({
        type: "status_change",
        fromStatus: "confirmed",
        toStatus: "waiting",
      }),
      atividade({ type: "status_change", fromStatus: "waiting", toStatus: "cancelled", content: "Paciente passou mal" }),
    ]);
    renderHistory();

    expect(await screen.findByText("Consulta agendada")).toBeInTheDocument();
    expect(service.listActivities).toHaveBeenCalledWith("a-1");
    expect(screen.getByText(/Carla Secretária/)).toBeInTheDocument();
    expect(screen.getByText("Confirmada → Aguardando")).toBeInTheDocument();
    expect(screen.getByText("Aguardando → Cancelada")).toBeInTheDocument();
    expect(screen.getByText("Paciente passou mal")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há nada registrado", async () => {
    service.listActivities.mockResolvedValue([]);
    renderHistory();
    expect(await screen.findByText("Nada registrado ainda.")).toBeInTheDocument();
  });

  it("comenta, limpa o campo e recarrega o histórico", async () => {
    service.listActivities.mockResolvedValue([]);
    service.addComment.mockResolvedValue(atividade({ type: "comment" }));
    const user = userEvent.setup();
    renderHistory();
    await screen.findByText("Nada registrado ainda.");

    const campo = screen.getByLabelText("Comentário");
    const botao = screen.getByRole("button", { name: "Comentar" });
    expect(botao).toBeDisabled();

    await user.type(campo, "  ligar antes  ");
    await user.click(botao);

    await waitFor(() =>
      expect(service.addComment).toHaveBeenCalledWith("a-1", "ligar antes"),
    );
    await waitFor(() => expect(campo).toHaveValue(""));
    expect(service.listActivities).toHaveBeenCalledTimes(2);
  });

  it("mostra o erro da API ao comentar", async () => {
    service.listActivities.mockResolvedValue([]);
    service.addComment.mockRejectedValue(
      new AxiosError("x", "400", undefined, undefined, {
        data: { message: "Comentário muito longo" },
        status: 400,
        statusText: "",
        headers: {},
        config: {} as never,
      }),
    );
    const user = userEvent.setup();
    renderHistory();
    await screen.findByText("Nada registrado ainda.");

    await user.type(screen.getByLabelText("Comentário"), "oi");
    await user.click(screen.getByRole("button", { name: "Comentar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Comentário muito longo",
    );
  });

  it("sem Agenda, só lê: não há campo de comentário", async () => {
    service.listActivities.mockResolvedValue([]);
    renderHistory(false);
    await screen.findByText("Nada registrado ainda.");
    expect(screen.queryByLabelText("Comentário")).not.toBeInTheDocument();
  });
});
