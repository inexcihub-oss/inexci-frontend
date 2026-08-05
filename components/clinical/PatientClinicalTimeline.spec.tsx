import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

// Atendimento concedido por padrão — a ausência da permissão é o próprio
// mecanismo testado mais abaixo.
let authState = { can: (p: Permission) => p === Permission.ATENDIMENTO };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: { getByPatient: vi.fn() },
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { PatientClinicalTimeline } from "./PatientClinicalTimeline";

const record = {
  id: "r-1",
  doctorId: "d-1",
  patientId: "p-1",
  appointmentId: "a-1",
  anamnesis: "<p>Dor lombar</p>",
  physicalExam: null,
  diagnosis: "<p>Lombalgia</p>",
  cidCodes: [],
  conduct: null,
  finalizedAt: "2026-01-01T13:00:00.000Z",
  createdAt: "2026-01-01T12:30:00.000Z",
  updatedAt: "2026-01-01T13:00:00.000Z",
};

describe("PatientClinicalTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.ATENDIMENTO };
    (
      clinicalRecordService.getByPatient as ReturnType<typeof vi.fn>
    ).mockResolvedValue([record]);
  });

  it("mostra o prontuário para quem tem Atendimento", async () => {
    render(<PatientClinicalTimeline patientId="p-1" />);

    expect(await screen.findByText("Lombalgia")).toBeInTheDocument();
  });

  /**
   * `GET /clinical-records` exige Atendimento na classe do controller.
   * "Renderizar vazio" mentiria (pareceria que o paciente não tem
   * atendimento nenhum) — a seção não deve nem existir para esse usuário.
   */
  it("não renderiza nem busca o prontuário para quem não tem Atendimento", () => {
    authState = { can: () => false };
    const { container } = render(<PatientClinicalTimeline patientId="p-1" />);

    expect(container).toBeEmptyDOMElement();
    expect(clinicalRecordService.getByPatient).not.toHaveBeenCalled();
  });
});
