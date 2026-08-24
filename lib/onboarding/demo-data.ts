import type { Appointment } from "@/services/appointment.service";
import type { Patient } from "@/services/patient.service";

/**
 * Id reservado para a consulta fabricada do tour de onboarding.
 * `/atendimento/[appointmentId]` reconhece este valor e usa dados
 * fabricados em memória em vez de buscar no backend — nunca existe uma
 * consulta real com este id.
 */
export const TOUR_DEMO_APPOINTMENT_ID = "tour-demo";
const TOUR_DEMO_PATIENT_ID = "tour-demo-paciente";

/**
 * Consulta fabricada só para o tour — nunca enviada ao backend. `doctorId`
 * usa o médico de verdade (o próprio usuário, quando é médico) para que os
 * botões que dependem de `doctorId` (templates de anamnese, documentos)
 * funcionem como numa consulta real.
 */
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

/**
 * Paciente fabricado que acompanha `criarConsultaDemo`. Sem `healthPlanId`
 * de propósito: `AtendimentoTabs` só busca o convênio quando esse campo
 * existe, e uma busca real por um id fabricado não deve acontecer.
 */
export function criarPacienteDemo(): Patient {
  const agora = new Date().toISOString();
  return {
    id: TOUR_DEMO_PATIENT_ID,
    name: "Paciente de demonstração",
    createdAt: agora,
    updatedAt: agora,
  };
}
