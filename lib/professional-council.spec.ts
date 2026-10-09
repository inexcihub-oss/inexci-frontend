import { describe, it, expect } from "vitest";
import { professionalKindLabel,
  canOwnSurgeryRequest,
  councilOf,
  formatRegistration,
} from "./professional-council";

describe("formatRegistration", () => {
  it("formata CRM com número e UF", () => {
    expect(formatRegistration({ crm: "12345", crmState: "RJ" })).toBe(
      "CRM 12345/RJ",
    );
  });

  it("usa o conselho do perfil", () => {
    expect(
      formatRegistration({ council: "CRN", crm: "4567", crmState: "RJ" }),
    ).toBe("CRN 4567/RJ");
  });

  it("não mostra nada sem número — nem a sigla do conselho sozinha", () => {
    expect(formatRegistration({ council: "CRP", crm: null })).toBe("");
    expect(formatRegistration({ council: "OUTRO", crm: null })).toBe("");
    expect(formatRegistration({ council: "CRM", crm: "   " })).toBe("");
    expect(formatRegistration(null)).toBe("");
  });

  it("perfil sem conselho e com número vazio não vira 'CRM'", () => {
    expect(formatRegistration({ crm: "", crmState: "" })).toBe("");
  });

  it("conselho OUTRO com número não exibe o valor cru do enum", () => {
    expect(
      formatRegistration({ council: "OUTRO", crm: "123", crmState: "RJ" }),
    ).toBe("Registro 123/RJ");
  });

  it("omite a UF quando ausente", () => {
    expect(formatRegistration({ council: "COREN", crm: "99" })).toBe(
      "COREN 99",
    );
  });
});

describe("councilOf", () => {
  it("perfil sem conselho é CRM", () => {
    expect(councilOf({})).toBe("CRM");
    expect(councilOf(undefined)).toBe("CRM");
  });
});

describe("canOwnSurgeryRequest", () => {
  it("só médico (CRM) pode ser o médico da SC", () => {
    expect(canOwnSurgeryRequest({ isPhysician: true })).toBe(true);
    expect(canOwnSurgeryRequest({ isPhysician: false })).toBe(false);
  });

  it("resposta antiga sem isPhysician continua elegível", () => {
    expect(canOwnSurgeryRequest({})).toBe(true);
  });
});

describe("professionalKindLabel", () => {
  it("só CRM é Médico; os demais pela área; sem conselho, Profissional", () => {
    expect(professionalKindLabel({ council: "CRM" })).toBe("Médico");
    expect(professionalKindLabel({})).toBe("Médico");
    expect(professionalKindLabel({ council: "CRN" })).toBe("Nutrição");
    expect(professionalKindLabel({ council: "CRP" })).toBe("Psicologia");
    expect(professionalKindLabel({ council: "COREN" })).toBe("Enfermagem");
    expect(professionalKindLabel({ council: "OUTRO" })).toBe("Profissional");
  });
});
