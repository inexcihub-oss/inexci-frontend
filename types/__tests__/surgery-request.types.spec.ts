import { describe, it, expect } from "vitest";
import type {
  Doctor,
  SurgeryRequest,
  PriorityLevel,
  Pendency,
  PendenciesSummary,
  KanbanColumn,
  Patient,
  SurgeryRequestStatus,
} from "../surgery-request.types";

describe("surgery-request.types", () => {
  describe("Doctor interface", () => {
    it("deve aceitar Doctor com campos básicos", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. João Silva",
      };
      expect(doctor.id).toBe("uuid-123");
      expect(doctor.name).toBe("Dr. João Silva");
      expect(doctor.doctor_profile).toBeUndefined();
    });

    it("deve aceitar Doctor com doctor_profile completo", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. João Silva",
        email: "joao@example.com",
        phone: "11999999999",
        avatarUrl: "https://example.com/avatar.png",
        avatarColor: "#FF5733",
        doctor_profile: {
          id: "dp-uuid-456",
          user_id: "uuid-123",
          crm: "123456",
          crm_state: "SP",
          specialty: "Ortopedia",
          signature_url: "https://example.com/signature.png",
          clinic_name: "Clínica São Paulo",
        },
      };
      expect(doctor.doctor_profile?.crm).toBe("123456");
      expect(doctor.doctor_profile?.crm_state).toBe("SP");
      expect(doctor.doctor_profile?.specialty).toBe("Ortopedia");
      expect(doctor.doctor_profile?.signature_url).toBe(
        "https://example.com/signature.png",
      );
      expect(doctor.doctor_profile?.clinic_name).toBe("Clínica São Paulo");
    });

    it("deve aceitar Doctor com doctor_profile parcial (campos opcionais)", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. Maria",
        doctor_profile: {
          id: "dp-uuid-789",
          user_id: "uuid-123",
          crm: "654321",
          crm_state: "RJ",
        },
      };
      expect(doctor.doctor_profile?.specialty).toBeUndefined();
      expect(doctor.doctor_profile?.signature_url).toBeUndefined();
      expect(doctor.doctor_profile?.clinic_name).toBeUndefined();
    });

    it("deve aceitar Doctor com email e phone sem doctor_profile", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. Carlos",
        email: "carlos@example.com",
        phone: "21988888888",
      };
      expect(doctor.email).toBe("carlos@example.com");
      expect(doctor.phone).toBe("21988888888");
      expect(doctor.doctor_profile).toBeUndefined();
    });
  });

  describe("SurgeryRequest com novo Doctor", () => {
    it("deve acessar doctor.name diretamente (nova estrutura)", () => {
      const request: SurgeryRequest = {
        id: "sr-001",
        patient: { id: "p-001", name: "Paciente Teste" },
        procedureName: "Artroscopia",
        doctor: {
          id: "d-001",
          name: "Dr. João",
          doctor_profile: {
            id: "dp-001",
            user_id: "d-001",
            crm: "123456",
            crm_state: "SP",
            specialty: "Ortopedia",
          },
        },
        priority: 2,
        pendenciesCount: 3,
        createdAt: "2024-01-01",
        deadline: "2024-02-01",
        status: "Pendente",
      };

      // Nova estrutura: doctor é User, doctor_profile é aninhado
      expect(request.doctor.name).toBe("Dr. João");
      expect(request.doctor.doctor_profile?.crm).toBe("123456");
      expect(request.doctor.doctor_profile?.specialty).toBe("Ortopedia");
    });

    it("deve funcionar sem doctor_profile (médico sem perfil profissional)", () => {
      const request: SurgeryRequest = {
        id: "sr-002",
        patient: { id: "p-002", name: "Paciente 2" },
        procedureName: "Consulta",
        doctor: {
          id: "d-002",
          name: "Dr. Maria",
        },
        priority: 1,
        pendenciesCount: 0,
        createdAt: "2024-01-01",
        deadline: "2024-02-01",
        status: "Enviada",
      };

      expect(request.doctor.name).toBe("Dr. Maria");
      expect(request.doctor.doctor_profile).toBeUndefined();
    });
  });

  describe("Constantes de prioridade", () => {
    it("PriorityLevel aceita valores 1-4", () => {
      const priorities: PriorityLevel[] = [1, 2, 3, 4];
      expect(priorities).toHaveLength(4);
    });
  });

  describe("SurgeryRequestStatus", () => {
    it("aceita todos os status válidos", () => {
      const statuses: SurgeryRequestStatus[] = [
        "Pendente",
        "Enviada",
        "Em Análise",
        "Em Agendamento",
        "Agendada",
        "Realizada",
        "Faturada",
        "Finalizada",
        "Encerrada",
      ];
      expect(statuses).toHaveLength(9);
    });
  });
});
