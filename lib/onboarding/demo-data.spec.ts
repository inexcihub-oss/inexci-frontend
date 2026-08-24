import { describe, it, expect } from "vitest";
import {
  criarConsultaDemo,
  criarPacienteDemo,
  TOUR_DEMO_APPOINTMENT_ID,
} from "./demo-data";

describe("demo-data", () => {
  it("fabrica uma consulta com o id sentinela e status agendada", () => {
    const consulta = criarConsultaDemo("medico-1");
    expect(consulta.id).toBe(TOUR_DEMO_APPOINTMENT_ID);
    expect(consulta.doctorId).toBe("medico-1");
    expect(consulta.status).toBe("scheduled");
    expect(consulta.type).toBe("first_visit");
    expect(consulta.patient?.name).toBe("Paciente de demonstração");
    expect(consulta.clinicId).toBeNull();
  });

  it("fabrica um paciente sem convênio, para não disparar busca real de plano de saúde", () => {
    const paciente = criarPacienteDemo();
    expect(paciente.healthPlanId).toBeUndefined();
    expect(paciente.name).toBe("Paciente de demonstração");
    expect(paciente.id).toBe("tour-demo-paciente");
  });

  it("o patientId da consulta fabricada bate com o id do paciente fabricado", () => {
    const consulta = criarConsultaDemo("medico-1");
    const paciente = criarPacienteDemo();
    expect(consulta.patientId).toBe(paciente.id);
  });
});
