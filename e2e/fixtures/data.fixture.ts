/** Factories para dados de teste. Retornam objetos parciais com defaults. */

export function makeSurgeryRequestPayload(overrides: Record<string, unknown> = {}) {
  return {
    patient_id: "pat-001",
    doctor_id: "user-admin-001",
    hospital_id: "hosp-001",
    health_plan_id: "hp-001",
    procedure_name: "Artroscopia de Joelho",
    priority: 2,
    deadline: "2026-05-31",
    observations: "Observações de teste",
    ...overrides,
  };
}

export function makePatientPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Paciente Teste",
    cpf: "000.000.000-01",
    birth_date: "1990-06-15",
    phone: "(11) 91111-0001",
    email: "paciente.teste@email.com",
    rg: "99999999",
    address: "Rua Nova, 200",
    zip_code: "04567-000",
    ...overrides,
  };
}

export function makeHospitalPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Hospital Novo",
    address: "Rua do Hospital, 999",
    email: "novo@hospital.com",
    phone: "(11) 6666-0001",
    ...overrides,
  };
}

export function makeHealthPlanPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Bradesco Saúde",
    email: "operacional@bradesco.com",
    phone: "(11) 7777-0001",
    ...overrides,
  };
}

export function makeCollaboratorPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Novo Colaborador",
    email: `colaborador.${Date.now()}@inexci.com`,
    password: "Senha@123",
    role: "collaborator",
    ...overrides,
  };
}
