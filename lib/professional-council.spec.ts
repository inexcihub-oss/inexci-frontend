import { describe, it, expect } from "vitest";
import {
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

  it("mostra só o conselho quando não há número", () => {
    expect(formatRegistration({ council: "CRP", crm: null })).toBe("CRP");
  });

  it("não mostra nada para OUTRO sem número nem sem perfil", () => {
    expect(formatRegistration({ council: "OUTRO", crm: null })).toBe("");
    expect(formatRegistration(null)).toBe("");
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
