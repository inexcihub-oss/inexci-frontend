import { describe, it, expect } from "vitest";
import {
  buildClinicalAccessCsv,
  clinicalActionLabel,
  clinicalResourceLabel,
  formatPatientRef,
  normalizePatientLookup,
  parseSecurityDays,
  sumSecurityEvents,
} from "../admin-security";

const zeros = {
  login_failed: 0,
  login_locked: 0,
  mfa_failed: 0,
  refresh_reuse: 0,
  password_changed: 0,
  mfa_enabled: 0,
  mfa_disabled: 0,
};

describe("lib/admin-security", () => {
  it("parseSecurityDays aceita só os períodos conhecidos", () => {
    expect(parseSecurityDays("7")).toBe(7);
    expect(parseSecurityDays("45")).toBe(30);
    expect(parseSecurityDays(null)).toBe(30);
  });

  it("sumSecurityEvents soma só os tipos pedidos", () => {
    expect(
      sumSecurityEvents({ ...zeros, login_failed: 2, mfa_enabled: 9 }, [
        "login_failed",
        "mfa_failed",
      ]),
    ).toBe(2);
  });

  it("rótulos traduzem recurso e ação, com fallback legível", () => {
    expect(clinicalResourceLabel("clinical_record")).toBe(
      "Ficha de atendimento",
    );
    expect(clinicalActionLabel("read")).toBe("Leitura");
    expect(clinicalActionLabel("set_hospital")).toBe("set hospital");
  });

  it("CSV traz só usuário, recurso, ação, contagem e data, e neutraliza fórmula", () => {
    const csv = buildClinicalAccessCsv([
      {
        userId: "u-1",
        userName: '=HYPERLINK("x")',
        resource: "patient",
        action: "read",
        total: 3,
        lastAccessAt: "2026-10-27T15:00:00Z",
      },
    ]);
    const [header, linha] = csv.split("\n");
    expect(header).toBe("Usuário,Recurso,Ação,Acessos,Último acesso");
    expect(linha).toBe(
      '"\'=HYPERLINK(""x"")","Cadastro do paciente","Leitura","3","27/10/2026, 12:00"',
    );
    expect(csv).not.toContain("u-1");
  });

  it("usuário removido aparece com rótulo", () => {
    const csv = buildClinicalAccessCsv([
      {
        userId: null,
        userName: null,
        resource: "patient",
        action: "list",
        total: 1,
        lastAccessAt: "2026-10-27T15:00:00Z",
      },
    ]);
    expect(csv).toContain('"Usuário removido"');
  });

  it("aceita código do painel ou id completo do paciente e recusa o resto", () => {
    expect(normalizePatientLookup("#A1B2C3D4E5")).toBe("a1b2c3d4e5");
    expect(
      normalizePatientLookup(" 3F2504E0-4F89-11D3-9A0C-0305E82C3301 "),
    ).toBe("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
    expect(normalizePatientLookup("Maria Silva")).toBeNull();
    expect(normalizePatientLookup("a1b2")).toBeNull();
    expect(formatPatientRef("a1b2c3d4e5")).toBe("#A1B2C3D4E5");
  });
});
