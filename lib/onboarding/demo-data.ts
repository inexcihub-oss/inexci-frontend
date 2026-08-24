import type { Appointment } from "@/services/appointment.service";
import type { Patient } from "@/services/patient.service";
import type { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import type { Collaborator } from "@/services/collaborator.service";

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

/**
 * Marcador de proveniência: `ExtractFromDocumentResponse.tempStoragePath` é o
 * campo que a tela de revisão (`nova-via-documento/page.tsx`) já manda de
 * volta no payload de criação — usá-lo aqui deixa o guard de "Criar
 * solicitação" checar a proveniência do dado sem precisar de um campo novo.
 */
export const TOUR_DEMO_EXTRACTION_MARKER = "tour-demo";

/**
 * Extração fabricada só para o tour — nunca passa por `extractFromDocument`/
 * `waitForExtractionResult`. Sem candidatos de propósito: `nova-via-documento`
 * usa a ausência de candidatos para decidir "novo paciente" e pré-preencher o
 * formulário a partir de `extracted.patient`.
 */
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

/**
 * Id reservado para o colaborador fabricado do tour de onboarding.
 * `/colaboradores/assistente/[id]` reconhece este valor e usa dados
 * fabricados em memória em vez de buscar no backend — nunca existe um
 * colaborador real com este id.
 */
export const TOUR_DEMO_COLLABORATOR_ID = "tour-demo-colaborador";

/**
 * Colaborador fabricado só para o tour — nunca médico, de propósito: um
 * colaborador médico exigiria simular também emissão de assinatura/cabeçalho
 * (`doctorProfile`), fora de escopo deste item (B3 do design doc).
 */
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
