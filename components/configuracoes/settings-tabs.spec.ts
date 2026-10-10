import { describe, it, expect } from "vitest";
import { resolveSettingsTab, type SettingsTabAccess } from "./settings-tabs";

const TUDO: SettingsTabAccess = {
  isAccountOwner: true,
  emiteDocumentos: true,
  isDoctor: true,
  podeAdministrar: true,
  hasUser: true,
};
const NADA: SettingsTabAccess = {
  isAccountOwner: false,
  emiteDocumentos: false,
  isDoctor: false,
  podeAdministrar: false,
  hasUser: true,
};

describe("resolveSettingsTab", () => {
  it("aceita as abas conhecidas para quem tem acesso", () => {
    for (const tab of [
      "profile",
      "notifications",
      "plan",
      "security",
      "header",
      "privacy",
      "onboarding",
      "document-templates",
      "my-schedule",
      "holidays",
    ]) {
      expect(resolveSettingsTab(tab, TUDO)).toBe(tab);
    }
  });

  it("manda para o Perfil quem pede aba restrita sem acesso", () => {
    for (const tab of ["plan", "document-templates", "my-schedule", "holidays"]) {
      expect(resolveSettingsTab(tab, NADA)).toBe("profile");
    }
  });

  it("ignora valor desconhecido ou ausente", () => {
    expect(resolveSettingsTab("inexistente", TUDO)).toBeNull();
    expect(resolveSettingsTab(null, TUDO)).toBeNull();
  });
});
