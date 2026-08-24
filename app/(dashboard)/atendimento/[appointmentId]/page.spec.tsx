import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AtendimentoPage from "./page";

const getByIdMock = vi.fn();
const getPatientByIdMock = vi.fn();
const getByAppointmentMock = vi.fn();

vi.mock("@/services/appointment.service", () => ({
  appointmentService: { getById: (...a: unknown[]) => getByIdMock(...a) },
}));
vi.mock("@/services/patient.service", () => ({
  patientService: { getById: (...a: unknown[]) => getPatientByIdMock(...a) },
}));
vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: {
    getByAppointment: (...a: unknown[]) => getByAppointmentMock(...a),
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

let appointmentId = "appt-real-1";
vi.mock("next/navigation", () => ({
  useParams: () => ({ appointmentId }),
}));

let authUser: { doctorProfile?: { id: string } } | null = {
  doctorProfile: { id: "doctor-1" },
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock("@/components/clinical/AtendimentoTabs", () => ({
  AtendimentoTabs: ({
    appointment,
    patient,
  }: {
    appointment: { id: string };
    patient: { id: string };
  }) => (
    <div data-testid="atendimento-tabs">
      {appointment.id} · {patient.id}
    </div>
  ),
}));

describe("AtendimentoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointmentId = "appt-real-1";
    authUser = { doctorProfile: { id: "doctor-1" } };
    getByIdMock.mockResolvedValue({
      id: "appt-real-1",
      patientId: "pac-real-1",
      doctorId: "doctor-1",
    });
    getPatientByIdMock.mockResolvedValue({ id: "pac-real-1", name: "Real" });
    getByAppointmentMock.mockResolvedValue(null);
  });

  it("busca dados reais quando o id não é o sentinela do tour", async () => {
    render(<AtendimentoPage />);

    await waitFor(() =>
      expect(screen.getByTestId("atendimento-tabs")).toBeInTheDocument(),
    );
    expect(getByIdMock).toHaveBeenCalledWith("appt-real-1");
    expect(screen.getByTestId("atendimento-tabs")).toHaveTextContent(
      "appt-real-1 · pac-real-1",
    );
  });

  it("usa dados fabricados e não chama o backend quando o id é o sentinela do tour", async () => {
    appointmentId = "tour-demo";
    render(<AtendimentoPage />);

    await waitFor(() =>
      expect(screen.getByTestId("atendimento-tabs")).toBeInTheDocument(),
    );
    expect(getByIdMock).not.toHaveBeenCalled();
    expect(getPatientByIdMock).not.toHaveBeenCalled();
    expect(getByAppointmentMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("atendimento-tabs")).toHaveTextContent(
      "tour-demo · tour-demo-paciente",
    );
  });
});
