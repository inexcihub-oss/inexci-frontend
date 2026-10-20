import type { Appointment } from "@/services/appointment.service";
import type { Patient } from "@/services/patient.service";
import type { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import type { Collaborator } from "@/services/collaborator.service";

export const TOUR_DEMO_APPOINTMENT_ID = "tour-demo";
const TOUR_DEMO_PATIENT_ID = "tour-demo-paciente";

export function criarConsultaDemo(doctorId: string): Appointment {
  return {
    id: TOUR_DEMO_APPOINTMENT_ID,
    doctorId,
    patientId: TOUR_DEMO_PATIENT_ID,
    type: "first_visit",
    status: "scheduled",
    scheduledAt: new Date().toISOString(),
    durationMinutes: 30,
    notes: null,
    cancellationReason: null,
    patient: { id: TOUR_DEMO_PATIENT_ID, name: "Paciente de demonstração" },
    clinicId: null,
    clinic: null,
  };
}

export function criarPacienteDemo(): Patient {
  const agora = new Date().toISOString();
  return {
    id: TOUR_DEMO_PATIENT_ID,
    name: "Paciente de demonstração",
    createdAt: agora,
    updatedAt: agora,
  };
}

export const TOUR_DEMO_EXTRACTION_MARKER = "tour-demo";

export function criarExtracaoDemo(): ExtractFromDocumentResponse {
  return {
    kind: "surgery_request",
    confidence: 0.95,
    extracted: {
      patient: {
        name: "Paciente de demonstração",
        birthDate: "1985-04-12",
        gender: "F",
      },
      hospital: "Hospital de demonstração",
      healthPlan: { name: "Convênio de demonstração" },
      suggestedProcedureName: "Artroscopia de joelho (exemplo)",
      tuss: [
        { code: "30912042", description: "Artroscopia de joelho", qty: 1 },
      ],
      opme: [{ description: "Âncora de sutura (exemplo)", qty: 2 }],
    },
    suggestedDocumentType: "Guia de solicitação",
    patientCpfMissing: true,
    patientMatchedByCpf: false,
    candidates: { patient: [], hospital: [], healthPlan: [], procedure: [] },
    tempStoragePath: TOUR_DEMO_EXTRACTION_MARKER,
    originalFileName: "documento-exemplo.pdf",
  };
}

export const TOUR_DEMO_COLLABORATOR_ID = "tour-demo-colaborador";

export function criarColaboradorDemo(): Collaborator {
  const agora = new Date().toISOString();
  return {
    id: TOUR_DEMO_COLLABORATOR_ID,
    name: "Colaborador de demonstração",
    email: "colaborador.demo@inexci.com",
    phone: "",
    status: "active",
    isDoctor: false,
    permissions: [],
    grantedPermissions: [],
    createdAt: agora,
    updatedAt: agora,
  };
}
