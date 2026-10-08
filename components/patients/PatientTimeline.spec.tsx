import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { PatientTimeline } from "./PatientTimeline";
import { montarHistorico } from "@/lib/patient-history";
import {
  Appointment,
  appointmentService,
} from "@/services/appointment.service";

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return { ...actual, appointmentService: { listActivities: vi.fn() } };
});

const consulta = (id: string, doctorId: string, scheduledAt: string) =>
  ({
    id,
    doctorId,
    patientId: "p-1",
    type: "follow_up",
    status: "completed",
    scheduledAt,
    durationMinutes: 30,
    notes: null,
    cancellationReason: null,
    clinicId: null,
  }) as Appointment;

const historico = montarHistorico({
  appointments: [
    consulta("a-1", "d-ana", "2020-05-04T13:00:00.000Z"),
    consulta("a-2", "d-ana", "2020-05-11T13:00:00.000Z"),
    consulta("a-3", "d-bia", "2020-05-18T13:00:00.000Z"),
  ],
  records: [],
  surgeries: [],
});

const profissionais = new Map([
  ["d-ana", "Ana Nutricionista"],
  ["d-bia", "Bia Fisioterapeuta"],
]);

describe("PatientTimeline — filtro de profissional", () => {
  it("usa o filtro da Agenda, com a contagem de visitas, e filtra a lista", async () => {
    const user = userEvent.setup();
    render(
      <PatientTimeline
        historico={historico}
        documents={[]}
        profissionais={profissionais}
        podeVerSolicitacoes
      />,
    );

    expect(screen.getAllByText(/Ana Nutricionista|Bia Fisioterapeuta/)).toHaveLength(3);

    await user.click(
      screen.getByRole("button", { name: "Profissionais: Todos os profissionais" }),
    );
    const opcao = screen.getByRole("checkbox", {
      name: /Ana Nutricionista/,
    });
    expect(opcao).toHaveTextContent("2");
    await user.click(opcao);

    const cartoes = screen
      .getAllByRole("button", { expanded: false })
      .filter((b) => /Acompanhamento/.test(b.textContent ?? ""));
    expect(cartoes).toHaveLength(2);
    cartoes.forEach((c) => expect(c).toHaveTextContent("Ana Nutricionista"));
  });

  it("com um profissional só, não mostra o filtro", () => {
    render(
      <PatientTimeline
        historico={montarHistorico({
          appointments: [consulta("a-1", "d-ana", "2020-05-04T13:00:00.000Z")],
          records: [],
          surgeries: [],
        })}
        documents={[]}
        profissionais={profissionais}
        podeVerSolicitacoes
      />,
    );

    expect(
      screen.queryByRole("button", { name: /^Profissionais:/ }),
    ).not.toBeInTheDocument();
  });
});

describe("PatientTimeline — histórico da consulta", () => {
  it("mostra as mudanças de status ao abrir, só para leitura", async () => {
    vi.mocked(appointmentService.listActivities).mockResolvedValue([
      {
        id: "act-1",
        type: "status_change",
        fromStatus: "scheduled",
        toStatus: "confirmed",
        content: null,
        createdAt: "2020-05-03T13:00:00.000Z",
        user: { id: "u-1", name: "Carla Recepção" },
      },
    ]);
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PatientTimeline
          historico={montarHistorico({
            appointments: [consulta("a-1", "d-ana", "2020-05-04T13:00:00.000Z")],
            records: [],
            surgeries: [],
          })}
          documents={[]}
          profissionais={profissionais}
          podeVerSolicitacoes
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Acompanhamento/ }));
    expect(appointmentService.listActivities).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Histórico da consulta" }),
    );

    expect(await screen.findByText("Agendada → Confirmada")).toBeInTheDocument();
    expect(screen.getByText(/Carla Recepção/)).toBeInTheDocument();
    expect(appointmentService.listActivities).toHaveBeenCalledWith("a-1");
    expect(
      screen.queryByRole("textbox", { name: "Comentário" }),
    ).not.toBeInTheDocument();
  });
});
