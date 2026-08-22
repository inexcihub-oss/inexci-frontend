import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { normalizeBusinessHours } from "@/lib/business-hours";

const create = vi.fn().mockResolvedValue({ id: "appt-1" });
const update = vi.fn().mockResolvedValue({ id: "appt-1" });

const clinics = [
  {
    id: "clinic-1",
    name: "Unidade Centro",
    businessHours: normalizeBusinessHours({
      mon: [{ start: "08:00", end: "12:00" }],
    }),
    createdAt: "",
    updatedAt: "",
  },
];

vi.mock("@/hooks/useClinics", () => ({
  CLINICS_QUERY_KEY: ["clinics"],
  useClinics: () => ({ data: clinics, isLoading: false }),
}));
/**
 * Estado compartilhado entre o factory (hoisted, roda antes do resto do
 * arquivo) e os testes: alterna o mock de `useAvailableDoctors` entre
 * referência estável (o normal, como o TanStack Query memoiza em produção
 * depois que a query resolve) e instável (array novo a cada chamada — a
 * janela real antes da query resolver, ou quando ela nunca é "aquecida").
 * `vi.hoisted` é o jeito suportado de expor essa mutável ao factory do
 * `vi.mock`, que também é hoisted.
 */
const doctorsMockState = vi.hoisted(() => ({ unstable: false }));

vi.mock("@/hooks/useAvailableDoctors", () => {
  const stableData = [
    { id: "doctor-1", name: "Dra. Ana", specialty: "Ortopedia" },
  ];
  return {
    useAvailableDoctors: () => ({
      data: doctorsMockState.unstable
        ? [{ id: "doctor-1", name: "Dra. Ana", specialty: "Ortopedia" }]
        : stableData,
    }),
  };
});
vi.mock("@/services/appointment.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/appointment.service")
  >();
  return {
    ...original,
    appointmentService: {
      getAgenda: vi.fn().mockResolvedValue([]),
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
  };
});
vi.mock("@/services/patient.service", () => ({
  patientService: {
    list: vi.fn().mockResolvedValue({ records: [] }),
  },
}));
// NewAppointmentModal sempre monta o <NewPatientModal> (só o "isOpen" muda),
// e ele usa useAuth() para decidir se mostra o atalho de criar convênio.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ permissions: [] }),
}));

import { NewAppointmentModal } from "./NewAppointmentModal";

/** Segunda-feira, 17/08/2026. */
const SEGUNDA = "2026-08-17";

function abrirModal() {
  return render(
    <NewAppointmentModal
      isOpen
      onClose={vi.fn()}
      onSaved={vi.fn()}
      defaultDate={SEGUNDA}
      defaultTime="09:00"
      defaultPatientId="patient-1"
      defaultPatientLabel="João"
    />,
  );
}

describe("NewAppointmentModal — clínica e aviso de horário", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorsMockState.unstable = false;
  });

  it("não avisa nada enquanto nenhuma clínica está escolhida", () => {
    abrirModal();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /agendar consulta/i }),
    ).toBeInTheDocument();
  });

  /**
   * Âncora do tour de onboarding (trilha "agenda", passo "horario") em
   * `lib/onboarding/tour-registry.ts`. Sem este teste, remover o atributo (ou
   * trocar o elemento) quebra o tour em silêncio.
   */
  it('expõe data-tour="agenda-modal-horario" no bloco de data e horário', () => {
    abrirModal();

    expect(
      screen
        .getByPlaceholderText("DD/MM/AAAA")
        .closest('[data-tour="agenda-modal-horario"]'),
    ).not.toBeNull();
  });

  it("não avisa quando o horário está dentro do funcionamento", async () => {
    abrirModal();
    fireEvent.change(screen.getByLabelText(/clínica/i), {
      target: { value: "clinic-1" },
    });

    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("avisa e troca o botão quando o horário está fora do funcionamento", async () => {
    abrirModal();
    fireEvent.change(screen.getByLabelText(/clínica/i), {
      target: { value: "clinic-1" },
    });
    fireEvent.change(screen.getByLabelText(/horário/i), {
      target: { value: "20:00" },
    });

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(
      "A clínica Unidade Centro não atende segunda-feira às 20:00.",
    );
    expect(
      screen.getByRole("button", { name: /agendar mesmo assim/i }),
    ).toBeInTheDocument();
  });

  it("envia o clinicId ao salvar", async () => {
    abrirModal();
    fireEvent.change(screen.getByLabelText(/clínica/i), {
      target: { value: "clinic-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /agendar consulta/i }),
    );

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({ clinicId: "clinic-1" }),
    );
  });

  it("envia clinicId null quando nenhuma clínica é escolhida", async () => {
    abrirModal();
    fireEvent.click(
      screen.getByRole("button", { name: /agendar consulta/i }),
    );

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({ clinicId: null }),
    );
  });

  it("mantém a clínica escolhida quando a lista de médicos chega com referência instável (janela de carregamento)", async () => {
    doctorsMockState.unstable = true;
    abrirModal();
    fireEvent.change(screen.getByLabelText(/clínica/i), {
      target: { value: "clinic-1" },
    });

    // Provoca um re-render do modal (troca de horário, ainda dentro do
    // funcionamento da clínica). Antes da correção, `doctors` nas
    // dependências do efeito de preenchimento — com referência nova a cada
    // chamada do hook — refazia o formulário inteiro e zerava `clinicId`.
    fireEvent.change(screen.getByLabelText(/horário/i), {
      target: { value: "09:30" },
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/clínica/i)).toHaveValue("clinic-1"),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /agendar consulta/i }),
    );

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({ clinicId: "clinic-1" }),
    );
  });
});

describe("NewAppointmentModal — edição com clínica excluída (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorsMockState.unstable = false;
  });

  /** Consulta cuja clínica foi soft-deletada: não está mais em `useClinics`. */
  const consultaComClinicaExcluida = {
    id: "appt-1",
    doctorId: "doctor-1",
    patientId: "patient-1",
    patient: { id: "patient-1", name: "João" },
    type: "first_visit" as const,
    status: "scheduled" as const,
    scheduledAt: "2026-08-17T12:00:00.000Z",
    durationMinutes: 30,
    notes: null,
    cancellationReason: null,
    clinicId: "clinic-excluida",
    clinic: { id: "clinic-excluida", name: "Unidade Antiga" },
  };

  function abrirModalEdicao() {
    return render(
      <NewAppointmentModal
        isOpen
        onClose={vi.fn()}
        onSaved={vi.fn()}
        appointment={consultaComClinicaExcluida}
      />,
    );
  }

  it("exibe o nome da unidade excluída no select em vez de 'Nenhuma'", () => {
    abrirModalEdicao();

    const select = screen.getByLabelText(
      /clínica/i,
    ) as HTMLSelectElement;
    expect(select).toHaveValue("clinic-excluida");
    expect(
      screen.getByText("Unidade Antiga (excluída)"),
    ).toBeInTheDocument();
  });

  it("não envia clinicId ao salvar sem trocar a clínica excluída (só o horário)", async () => {
    abrirModalEdicao();

    fireEvent.change(screen.getByLabelText(/horário/i), {
      target: { value: "10:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /salvar alterações/i }),
    );

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1]).not.toHaveProperty("clinicId");
  });

  it("envia o clinicId novo quando o usuário troca para uma clínica da lista", async () => {
    abrirModalEdicao();

    fireEvent.change(screen.getByLabelText(/clínica/i), {
      target: { value: "clinic-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /salvar alterações/i }),
    );

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ clinicId: "clinic-1" }),
    );
  });
});
