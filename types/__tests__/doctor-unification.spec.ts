import { describe, it, expect } from "vitest";
import type { DoctorSummary } from "@/types";
import type { Doctor as SurgeryDoctor } from "@/types/surgery-request.types";
import type { Doctor as CollaboratorDoctor } from "@/services/collaborator.service";

/**
 * TASK-FE-I04: Testes para unificação de interfaces Doctor.
 *
 * Valida que:
 * 1. DoctorSummary é o tipo canônico em types/index.ts
 * 2. Doctor de surgery-request.types.ts é alias de DoctorSummary
 * 3. Doctor de collaborator.service.ts estende DoctorSummary com campos CRUD
 * 4. Todos os tipos são compatíveis entre si (assignability)
 */

describe("TASK-FE-I04 — Unificação de interfaces Doctor", () => {
  describe("DoctorSummary — tipo canônico", () => {
    it("aceita Doctor com campos mínimos (id + name)", () => {
      const doctor: DoctorSummary = {
        id: "u1",
        name: "Dr. Silva",
      };
      expect(doctor.id).toBe("u1");
      expect(doctor.name).toBe("Dr. Silva");
    });

    it("aceita Doctor com todos os campos opcionais", () => {
      const doctor: DoctorSummary = {
        id: "u2",
        name: "Dra. Maria",
        email: "maria@test.com",
        phone: "11999990000",
        avatarUrl: "https://example.com/avatar.jpg",
        avatarColor: "#3B82F6",
        doctor_profile: {
          id: "dp1",
          user_id: "u2",
          crm: "123456",
          crm_state: "SP",
          specialty: "Ortopedia",
          signature_url: "https://example.com/sig.png",
          clinic_name: "Clínica São Paulo",
        },
      };
      expect(doctor.doctor_profile?.crm).toBe("123456");
      expect(doctor.avatarUrl).toBe("https://example.com/avatar.jpg");
    });
  });

  describe("SurgeryDoctor — alias de DoctorSummary", () => {
    it("SurgeryDoctor é compatível com DoctorSummary", () => {
      // Se compila, os tipos são compatíveis
      const summary: DoctorSummary = { id: "1", name: "Dr. A" };
      const surgeryDoc: SurgeryDoctor = summary;
      expect(surgeryDoc.id).toBe("1");
    });

    it("DoctorSummary é compatível com SurgeryDoctor", () => {
      const surgeryDoc: SurgeryDoctor = { id: "2", name: "Dr. B" };
      const summary: DoctorSummary = surgeryDoc;
      expect(summary.name).toBe("Dr. B");
    });

    it("SurgeryDoctor tem os mesmos campos visuais", () => {
      const doc: SurgeryDoctor = {
        id: "3",
        name: "Dr. C",
        avatarUrl: "url",
        avatarColor: "#FFF",
      };
      expect(doc.avatarUrl).toBe("url");
      expect(doc.avatarColor).toBe("#FFF");
    });

    it("SurgeryDoctor tem doctor_profile", () => {
      const doc: SurgeryDoctor = {
        id: "4",
        name: "Dr. D",
        doctor_profile: {
          id: "dp4",
          user_id: "4",
          crm: "789",
          crm_state: "RJ",
        },
      };
      expect(doc.doctor_profile?.crm).toBe("789");
    });
  });

  describe("CollaboratorDoctor — estende DoctorSummary", () => {
    it("CollaboratorDoctor tem campos CRUD extras", () => {
      const doc: CollaboratorDoctor = {
        id: "5",
        name: "Dr. E",
        gender: "M",
        birthDate: "1990-01-01",
        document: "12345678900",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      expect(doc.gender).toBe("M");
      expect(doc.birthDate).toBe("1990-01-01");
      expect(doc.document).toBe("12345678900");
    });

    it("CollaboratorDoctor é compatível com DoctorSummary (upcast)", () => {
      const collabDoc: CollaboratorDoctor = {
        id: "6",
        name: "Dr. F",
        email: "f@test.com",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      // CollaboratorDoctor estende DoctorSummary, então é assignable
      const summary: DoctorSummary = collabDoc;
      expect(summary.id).toBe("6");
      expect(summary.email).toBe("f@test.com");
    });

    it("CollaboratorDoctor herda doctor_profile de DoctorSummary", () => {
      const doc: CollaboratorDoctor = {
        id: "7",
        name: "Dr. G",
        doctor_profile: {
          id: "dp7",
          user_id: "7",
          crm: "999",
          crm_state: "MG",
          specialty: "Cardio",
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      expect(doc.doctor_profile?.specialty).toBe("Cardio");
    });

    it("CollaboratorDoctor herda avatarUrl/avatarColor de DoctorSummary", () => {
      const doc: CollaboratorDoctor = {
        id: "8",
        name: "Dr. H",
        avatarUrl: "https://example.com/h.png",
        avatarColor: "#FF0000",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      expect(doc.avatarUrl).toBe("https://example.com/h.png");
    });
  });

  describe("Não há definições duplicadas", () => {
    it("DoctorSummary e SurgeryDoctor são o mesmo tipo", () => {
      // Prova bidirecional de compatibilidade
      const a: DoctorSummary = { id: "x", name: "A" };
      const b: SurgeryDoctor = a;
      const c: DoctorSummary = b;
      expect(c.id).toBe("x");
    });

    it("CollaboratorDoctor é superset de DoctorSummary", () => {
      const doc: CollaboratorDoctor = {
        id: "y",
        name: "B",
        gender: "F",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      // Pode ser atribuído a DoctorSummary (perde campos extras)
      const summary: DoctorSummary = doc;
      expect(summary.name).toBe("B");
      // Mas NÃO pode ir na direção oposta sem os campos obrigatórios
      // (isso é validado pelo TypeScript em compile-time)
    });
  });
});
