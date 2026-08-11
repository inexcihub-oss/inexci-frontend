import { describe, expect, it } from "vitest";
import { extractTemplateTussItemsForCreate } from "./normalize-template-tuss";

describe("normalize-template-tuss", () => {
  it("monta o payload apenas com os campos que o backend persiste", () => {
    const { items, duplicadosIgnorados } = extractTemplateTussItemsForCreate({
      tussItems: [
        {
          id: "e0883246-7d26-40b4-adec-4a1e6f40d39f",
          tussCode: "3.07.15.09-1",
          name: "Descompressão de cauda equina",
          quantity: 2,
          authorizedQuantity: null,
        },
      ],
    });

    // `id` é do item da SC de origem e `procedureId` não existe no catálogo
    // TUSS (vem de tuss.json, sem uuid) — nenhum dos dois pode vazar.
    expect(items).toEqual([
      {
        tussCode: "3.07.15.09-1",
        name: "Descompressão de cauda equina",
        quantity: 2,
      },
    ]);
    expect(duplicadosIgnorados).toEqual([]);
  });

  it("mantém o primeiro item e reporta os códigos repetidos", () => {
    const { items, duplicadosIgnorados } = extractTemplateTussItemsForCreate({
      tussItems: [
        { tussCode: "3.07.15.09-1", name: "Cauda equina L4-L5", quantity: 2 },
        { tussCode: "3.07.15.18-0", name: "Protusão discal", quantity: 2 },
        { tussCode: "3.07.15.09-1", name: "Cauda equina L5", quantity: 1 },
      ],
    });

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.tussCode)).toEqual([
      "3.07.15.09-1",
      "3.07.15.18-0",
    ]);
    expect(duplicadosIgnorados).toEqual(["Cauda equina L5 (3.07.15.09-1)"]);
  });

  it("descarta itens sem código TUSS", () => {
    const { items } = extractTemplateTussItemsForCreate({
      tussItems: [
        { tussCode: "", name: "Sem código", quantity: 1 },
        { name: "Sem campo nenhum", quantity: 1 },
        { tussCode: "3.07.15.19-9", name: "Hemilaminectomia", quantity: 1 },
      ],
    });

    expect(items).toEqual([
      { tussCode: "3.07.15.19-9", name: "Hemilaminectomia", quantity: 1 },
    ]);
  });

  it("aceita a chave legada `procedures` e normaliza quantidade ausente", () => {
    const { items } = extractTemplateTussItemsForCreate({
      procedures: [{ tussCode: "3.07.15.36-9", name: "Foraminotomia" }],
    });

    expect(items).toEqual([
      { tussCode: "3.07.15.36-9", name: "Foraminotomia", quantity: 1 },
    ]);
  });

  it("devolve lista vazia quando o modelo não tem TUSS", () => {
    expect(extractTemplateTussItemsForCreate({})).toEqual({
      items: [],
      duplicadosIgnorados: [],
    });
  });
});
