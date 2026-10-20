import { describe, it, expect, beforeEach } from "vitest";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  clearScFromDocumentStorage,
  readScFromDocumentHandoff,
  saveScFromDocumentHandoff,
  setScFromDocumentStorage,
} from "../sc-from-document-background";
import { criarExtracaoDemo } from "../onboarding/demo-data";

const resultado = {
  ...criarExtracaoDemo(),
  tempStoragePath: "whatsapp-tmp/laudo.pdf",
};

describe("handoff da SC via documento", () => {
  beforeEach(() => {
    clearScFromDocumentStorage();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("grava no navegador só jobId, userId e horário", () => {
    saveScFromDocumentHandoff({ result: resultado, userId: "u-1", jobId: "job-1" });

    const raw = localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY) ?? "";
    const envelope = JSON.parse(raw) as { value: Record<string, unknown> };
    expect(Object.keys(envelope.value).sort()).toEqual([
      "jobId",
      "savedAt",
      "userId",
    ]);
    expect(raw).not.toContain("whatsapp-tmp");
    expect(sessionStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
  });

  it("devolve o resultado em memória para o mesmo usuário", () => {
    saveScFromDocumentHandoff({ result: resultado, userId: "u-1", jobId: "job-1" });

    expect(readScFromDocumentHandoff("u-1")).toEqual({
      result: resultado,
      jobId: "job-1",
    });
  });

  it("sem memória (recarga), devolve só o jobId para buscar na API", () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      jobId: "job-1",
      userId: "u-1",
      savedAt: Date.now(),
    });

    expect(readScFromDocumentHandoff("u-1")).toEqual({ jobId: "job-1" });
  });

  it("descarta o que foi salvo por outro usuário", () => {
    saveScFromDocumentHandoff({ result: resultado, userId: "u-1", jobId: "job-1" });

    expect(readScFromDocumentHandoff("u-2")).toBeNull();
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(readScFromDocumentHandoff("u-1")).toBeNull();
  });

  it("apaga o resultado completo legado do localStorage e do sessionStorage", () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, resultado);
    sessionStorage.setItem(
      SC_FROM_DOCUMENT_EXTRACTION_KEY,
      JSON.stringify(resultado),
    );

    expect(readScFromDocumentHandoff("u-1")).toBeNull();
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
  });

  it("sem jobId (tour), mantém só em memória", () => {
    saveScFromDocumentHandoff({ result: resultado, userId: "u-1" });

    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(readScFromDocumentHandoff("u-1")).toEqual({
      result: resultado,
      jobId: undefined,
    });
  });

  it("clearScFromDocumentStorage limpa memória e navegador", () => {
    saveScFromDocumentHandoff({ result: resultado, userId: "u-1", jobId: "job-1" });

    clearScFromDocumentStorage();

    expect(readScFromDocumentHandoff("u-1")).toBeNull();
  });
});
