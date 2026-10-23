import { describe, it, expect } from "vitest";
import {
  resolveSettingsTab,
  settingsNavGroups,
  type SettingsTabAccess,
} from "./settings-tabs";

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
      "clinical-snippets",
      "my-schedule",
      "holidays",
      "patient-notices",
    ]) {
      expect(resolveSettingsTab(tab, TUDO)).toBe(tab);
    }
  });

  it("manda para o Perfil quem pede aba restrita sem acesso", () => {
    for (const tab of [
      "plan",
      "document-templates",
      "clinical-snippets",
      "my-schedule",
      "holidays",
      "patient-notices",
    ]) {
      expect(resolveSettingsTab(tab, NADA)).toBe("profile");
    }
  });

  it("ignora valor desconhecido ou ausente", () => {
    expect(resolveSettingsTab("inexistente", TUDO)).toBeNull();
    expect(resolveSettingsTab(null, TUDO)).toBeNull();
  });
});

describe("settingsNavGroups", () => {
  const resumo = (acesso: Parameters<typeof settingsNavGroups>[0]) =>
    settingsNavGroups(acesso).map((g) => [g.label, g.items.map((i) => i.id)]);

  it("agrupa do pessoal para a clínica, na ordem combinada", () => {
    expect(resumo({ ...TUDO, mostraCabecalho: true })).toEqual([
      ["Minha conta", ["profile", "security", "notifications"]],
      [
        "Atendimento",
        ["my-schedule", "clinical-snippets", "header", "document-templates"],
      ],
      ["Clínica", ["holidays", "patient-notices", "plan"]],
      ["Ajuda", ["onboarding", "privacy"]],
    ]);
  });

  it("esconde os grupos que ficariam vazios", () => {
    expect(resumo({ ...NADA, mostraCabecalho: false })).toEqual([
      ["Minha conta", ["profile", "security", "notifications"]],
      ["Ajuda", ["onboarding", "privacy"]],
    ]);
  });

  it("admin delegado vê a Clínica sem o plano, que é só do dono", () => {
    const clinica = settingsNavGroups({
      ...NADA,
      podeAdministrar: true,
      mostraCabecalho: false,
    }).find((g) => g.id === "clinica");
    expect(clinica?.items.map((i) => i.id)).toEqual([
      "holidays",
      "patient-notices",
    ]);
  });

  it("toda aba do menu é aceita pelo deep-link de quem a vê", () => {
    for (const grupo of settingsNavGroups({ ...TUDO, mostraCabecalho: true })) {
      for (const item of grupo.items) {
        expect(resolveSettingsTab(item.id, TUDO)).toBe(item.id);
      }
    }
  });
});
