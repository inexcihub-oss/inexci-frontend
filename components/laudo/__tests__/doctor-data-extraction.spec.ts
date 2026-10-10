import { describe, it, expect } from "vitest";

type SolicitacaoComMedico = {
  doctor?: {
    name?: string;
    email?: string;
    phone?: string;
    doctorProfile?: {
      specialty?: string;
      crm?: string;
      crmState?: string;
      signatureUrl?: string | null;
    } | null;
  } & Record<string, unknown> | null;
} & Record<string, unknown> | null | undefined;

function extractDoctorDataForDocument(solicitacao: SolicitacaoComMedico) {
  const doctorUser = solicitacao?.doctor ?? null;
  const doctorProfile = doctorUser?.doctorProfile ?? null;

  const doctorName = doctorUser?.name ?? "";
  const doctorEmail = doctorUser?.email ?? "";
  const doctorPhone = doctorUser?.phone ?? "";
  const doctorSpecialty = doctorProfile?.specialty ?? "";
  const crmNum = doctorProfile?.crm ?? "";
  const crmState = doctorProfile?.crmState ?? "";
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

function extractDoctorDataForReport(solicitacao: SolicitacaoComMedico) {
  const doctor = solicitacao?.doctor;
  const dp = doctor?.doctorProfile;

  return {
    signatureUrl: dp?.signatureUrl ?? null,
    name: doctor?.name ?? "",
    specialty: dp?.specialty ?? "",
    crm: dp?.crm ?? "",
    crmState: dp?.crmState ?? "",
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
      doctorProfile: {
        id: "dp-001",
        crm: "123456",
        crmState: "SP",
        specialty: "Ortopedia",
        signatureUrl: "https://storage.example.com/signatures/dr-joao.png",
        clinicName: "Clínica São Paulo",
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
          doctorProfile: { crm: "654321", crmState: "" },
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
      const solicitacaoEstruturaAntiga = {
        doctor: {
          crm: "123456",
          specialty: "Ortopedia",
          user: { name: "Dr. Antigo" },
        },
      };
      const result = extractDoctorDataForReport(solicitacaoEstruturaAntiga);

      expect(result.name).toBe("");
    });

    it("NÃO deve acessar doctor.signatureUrl diretamente (campo movido para doctor_profile)", () => {
      const solicitacao = {
        doctor: {
          name: "Dr. Test",
          signatureUrl: "https://old-location.com/sig.png",
          doctorProfile: { crm: "111", crmState: "RJ" },
        },
      };
      const result = extractDoctorDataForReport(solicitacao);

      expect(result.signatureUrl).toBeNull();
    });
  });
});
