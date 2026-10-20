import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { DOCUMENT_TEMPLATE_PLACEHOLDERS } from "./clinical-document-template.service";

const CHAVES_DA_API = [
  "paciente.nome",
  "paciente.cpf",
  "paciente.nascimento",
  "medico.nome",
  "medico.registro",
  "data",
  "dias",
  "inicio",
];

describe("DOCUMENT_TEMPLATE_PLACEHOLDERS", () => {
  it("oferece exatamente os placeholders que a API preenche", () => {
    expect(DOCUMENT_TEMPLATE_PLACEHOLDERS.map((p) => p.key)).toEqual(
      CHAVES_DA_API,
    );
  });

  it("todo placeholder tem rótulo", () => {
    for (const p of DOCUMENT_TEMPLATE_PLACEHOLDERS) {
      expect(p.label.trim()).not.toBe("");
    }
  });
});
