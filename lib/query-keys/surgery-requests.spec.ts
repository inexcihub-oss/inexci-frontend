import { describe, it, expect } from "vitest";
import { surgeryRequestKeys } from "./surgery-requests";

describe("surgeryRequestKeys", () => {
  it("mantém as chaves já usadas pelas telas (compatibilidade de invalidação)", () => {
    expect(surgeryRequestKeys.kanban()).toEqual(["surgery-requests", "kanban"]);
    expect(surgeryRequestKeys.agenda()).toEqual(["surgery-requests", "agenda"]);
    expect(surgeryRequestKeys.detail("sc-1")).toEqual([
      "surgery-request",
      "sc-1",
    ]);
  });

  it("pendências e atividades ficam sob o prefixo do detalhe", () => {
    const detail = surgeryRequestKeys.detail(7);
    expect(surgeryRequestKeys.pendencies(7).slice(0, 2)).toEqual(detail);
    expect(surgeryRequestKeys.activities(7).slice(0, 2)).toEqual(detail);
    expect(surgeryRequestKeys.details()).toEqual(["surgery-request"]);
  });
});
