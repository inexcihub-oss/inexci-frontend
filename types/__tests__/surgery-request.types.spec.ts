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
      expect(doctor.doctorProfile).toBeUndefined();
    });

    it("deve aceitar Doctor com doctor_profile completo", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. João Silva",
        email: "joao@example.com",
        phone: "11999999999",
        avatarUrl: "https://example.com/avatar.png",
        avatarColor: "#FF5733",
        doctorProfile: {
          id: "dp-uuid-456",
          userId: "uuid-123",
          crm: "123456",
          crmState: "SP",
          specialty: "Ortopedia",
          signatureUrl: "https://example.com/signature.png",
          clinicName: "Clínica São Paulo",
        },
      };
      expect(doctor.doctorProfile?.crm).toBe("123456");
      expect(doctor.doctorProfile?.crmState).toBe("SP");
      expect(doctor.doctorProfile?.specialty).toBe("Ortopedia");
      expect(doctor.doctorProfile?.signatureUrl).toBe(
        "https://example.com/signature.png",
      );
      expect(doctor.doctorProfile?.clinicName).toBe("Clínica São Paulo");
    });

    it("deve aceitar Doctor com doctor_profile parcial (campos opcionais)", () => {
      const doctor: Doctor = {
        id: "uuid-123",
        name: "Dr. Maria",
        doctorProfile: {
          id: "dp-uuid-789",
          userId: "uuid-123",
          crm: "654321",
          crmState: "RJ",
        },
      };
      expect(doctor.doctorProfile?.specialty).toBeUndefined();
      expect(doctor.doctorProfile?.signatureUrl).toBeUndefined();
      expect(doctor.doctorProfile?.clinicName).toBeUndefined();
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
      expect(doctor.doctorProfile).toBeUndefined();
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
          doctorProfile: {
            id: "dp-001",
            userId: "d-001",
            crm: "123456",
            crmState: "SP",
            specialty: "Ortopedia",
          },
        },
        priority: 2,
        pendenciesCount: 3,
        createdAt: "2024-01-01",
        status: "Pendente",
      };

      // Nova estrutura: doctor é User, doctor_profile é aninhado
      expect(request.doctor.name).toBe("Dr. João");
      expect(request.doctor.doctorProfile?.crm).toBe("123456");
      expect(request.doctor.doctorProfile?.specialty).toBe("Ortopedia");
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
        status: "Enviada",
      };

      expect(request.doctor.name).toBe("Dr. Maria");
      expect(request.doctor.doctorProfile).toBeUndefined();
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
