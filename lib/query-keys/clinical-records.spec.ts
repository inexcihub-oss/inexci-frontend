import { describe, it, expect } from "vitest";
import { clinicalRecordKeys, clinicalSnippetKeys } from "./index";

describe("clinicalRecordKeys e clinicalSnippetKeys", () => {
  it("textos rápidos não ficam sob o prefixo das fichas", () => {
    const prefixoFichas = clinicalRecordKeys.all;
    const chaveTextos = clinicalSnippetKeys.mine("doc-1");
    expect(chaveTextos.slice(0, prefixoFichas.length)).not.toEqual([
      ...prefixoFichas,
    ]);
  });

  it("os textos de cada usuário ficam sob a raiz dos textos rápidos", () => {
    expect(clinicalSnippetKeys.mine("doc-1").slice(0, 1)).toEqual([
      ...clinicalSnippetKeys.all,
    ]);
    expect(clinicalSnippetKeys.mine("doc-1")).not.toEqual(
      clinicalSnippetKeys.mine("doc-2"),
    );
  });
});
