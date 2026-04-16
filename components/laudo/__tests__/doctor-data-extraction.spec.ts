import { describe, it, expect } from "vitest";

/**
 * Testes para validar que a lógica de extração de dados do médico
 * usa a nova estrutura: doctor = User, doctor.doctor_profile = DoctorProfile
 *
 * Estes testes validam a lógica pura de extração, sem renderizar componentes React.
 */

// Simula a lógica de extração de SurgeryRequestDocumentPreviewModal
function extractDoctorDataForDocument(solicitacao: any) {
  const doctorUser = solicitacao?.doctor ?? null;
  const doctorProfile = doctorUser?.doctor_profile ?? null;

  const doctorName = doctorUser?.name ?? "";
  const doctorEmail = doctorUser?.email ?? "";
  const doctorPhone = doctorUser?.phone ?? "";
  const doctorSpecialty = doctorProfile?.specialty ?? "";
  const crmNum = doctorProfile?.crm ?? "";
  const crmState = doctorProfile?.crm_state ?? "";
  const doctorCRM = crmNum
    ? `CRM ${crmNum}${crmState ? `/${crmState}` : ""}`
    : "";

  return {
    doctorName,
    doctorEmail,
    doctorPhone,
    doctorSpecialty,
    crmNum,
    crmState,
    doctorCRM,
  };
}

// Simula a lógica de extração de MedicalReportPreviewModal
function extractDoctorDataForReport(solicitacao: any) {
  const doctor = solicitacao?.doctor;
  const dp = doctor?.doctor_profile;

  return {
    signatureUrl: dp?.signature_url ?? null,
    name: doctor?.name ?? "",
    specialty: dp?.specialty ?? "",
    crm: dp?.crm ?? "",
    crmState: dp?.crm_state ?? "",
  };
}

describe("Extração de dados do médico — Nova estrutura (User → doctor_profile)", () => {
  const solicitacaoCompleta = {
    id: "sr-001",
    doctor: {
      id: "user-001",
      name: "Dr. João Silva",
      email: "joao@clinica.com",
      phone: "11999998888",
      doctor_profile: {
        id: "dp-001",
        crm: "123456",
        crm_state: "SP",
        specialty: "Ortopedia",
        signature_url: "https://storage.example.com/signatures/dr-joao.png",
        clinic_name: "Clínica São Paulo",
      },
    },
  };

  const solicitacaoSemProfile = {
    id: "sr-002",
    doctor: {
      id: "user-002",
      name: "Dr. Maria Santos",
      email: "maria@clinica.com",
      phone: "21988887777",
    },
  };

  const solicitacaoSemDoctor = {
    id: "sr-003",
  };

  describe("SurgeryRequestDocumentPreviewModal — extractDoctorDataForDocument", () => {
    it("deve extrair todos os dados com solicitação completa", () => {
      const result = extractDoctorDataForDocument(solicitacaoCompleta);

      expect(result.doctorName).toBe("Dr. João Silva");
      expect(result.doctorEmail).toBe("joao@clinica.com");
      expect(result.doctorPhone).toBe("11999998888");
      expect(result.doctorSpecialty).toBe("Ortopedia");
      expect(result.crmNum).toBe("123456");
      expect(result.crmState).toBe("SP");
      expect(result.doctorCRM).toBe("CRM 123456/SP");
    });

    it("deve retornar nome do médico mas sem specialty/crm quando não há doctor_profile", () => {
      const result = extractDoctorDataForDocument(solicitacaoSemProfile);

      expect(result.doctorName).toBe("Dr. Maria Santos");
      expect(result.doctorEmail).toBe("maria@clinica.com");
      expect(result.doctorSpecialty).toBe("");
      expect(result.crmNum).toBe("");
      expect(result.doctorCRM).toBe("");
    });

    it("deve retornar strings vazias quando não há doctor", () => {
      const result = extractDoctorDataForDocument(solicitacaoSemDoctor);

      expect(result.doctorName).toBe("");
      expect(result.doctorEmail).toBe("");
      expect(result.doctorSpecialty).toBe("");
      expect(result.crmNum).toBe("");
      expect(result.doctorCRM).toBe("");
    });

    it("deve retornar strings vazias para solicitação null/undefined", () => {
      expect(extractDoctorDataForDocument(null).doctorName).toBe("");
      expect(extractDoctorDataForDocument(undefined).doctorName).toBe("");
    });

    it("deve formatar CRM sem estado quando crm_state está vazio", () => {
      const solicitacao = {
        doctor: {
          name: "Dr. Test",
          doctor_profile: { crm: "654321", crm_state: "" },
        },
      };
      const result = extractDoctorDataForDocument(solicitacao);
      expect(result.doctorCRM).toBe("CRM 654321");
    });
  });

  describe("MedicalReportPreviewModal — extractDoctorDataForReport", () => {
    it("deve extrair todos os dados com solicitação completa", () => {
      const result = extractDoctorDataForReport(solicitacaoCompleta);

      expect(result.name).toBe("Dr. João Silva");
      expect(result.specialty).toBe("Ortopedia");
      expect(result.crm).toBe("123456");
      expect(result.crmState).toBe("SP");
      expect(result.signatureUrl).toBe(
        "https://storage.example.com/signatures/dr-joao.png",
      );
    });

    it("deve retornar nome mas sem dados profissionais quando não há doctor_profile", () => {
      const result = extractDoctorDataForReport(solicitacaoSemProfile);

      expect(result.name).toBe("Dr. Maria Santos");
      expect(result.specialty).toBe("");
      expect(result.crm).toBe("");
      expect(result.crmState).toBe("");
      expect(result.signatureUrl).toBeNull();
    });

    it("deve retornar valores padrão quando não há doctor", () => {
      const result = extractDoctorDataForReport(solicitacaoSemDoctor);

      expect(result.name).toBe("");
      expect(result.specialty).toBe("");
      expect(result.crm).toBe("");
      expect(result.signatureUrl).toBeNull();
    });

    it("NÃO deve acessar doctor.user.name (estrutura antiga)", () => {
      // Simula dados na estrutura ANTIGA para garantir que não funciona
      const solicitacaoEstruturaAntiga = {
        doctor: {
          // DoctorProfile (antigo) — não tem .name
          crm: "123456",
          specialty: "Ortopedia",
          user: { name: "Dr. Antigo" },
        },
      };
      const result = extractDoctorDataForReport(solicitacaoEstruturaAntiga);

      // Na nova lógica, doctor.name viria do User (que agora É o doctor)
      // Se alguém mandar a estrutura antiga, o name não deve vir de doctor.user.name
      // mas sim de doctor.name (que não existe na estrutura antiga → "")
      expect(result.name).toBe(""); // NÃO deve ser "Dr. Antigo"
    });

    it("NÃO deve acessar doctor.signature_url diretamente (campo movido para doctor_profile)", () => {
      const solicitacao = {
        doctor: {
          name: "Dr. Test",
          signature_url: "https://old-location.com/sig.png", // campo no nível errado
          // doctor_profile não tem signature_url
          doctor_profile: { crm: "111", crm_state: "RJ" },
        },
      };
      const result = extractDoctorDataForReport(solicitacao);

      // signature_url deve vir de doctor_profile, não de doctor diretamente
      expect(result.signatureUrl).toBeNull();
    });
  });
});
