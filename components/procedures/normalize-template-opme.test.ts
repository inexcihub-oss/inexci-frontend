import { describe, expect, it } from "vitest";
import {
  extractTemplateOpmeItemsForCreate,
  normalizeTemplateOpmeItem,
  normalizeTemplateOpmeItems,
  toOpmeDisplayName,
} from "./normalize-template-opme";

describe("normalize-template-opme", () => {
  it("extrai nome de entidade completa de fornecedor", () => {
    expect(
      toOpmeDisplayName({
        id: "1",
        name: "Fornecedor ABC",
        cnpj: "123",
        anvisaRegistration: "BR-1",
      }),
    ).toBe("Fornecedor ABC");
  });

  it("normaliza fabricantes e fornecedores como objetos", () => {
    const item = normalizeTemplateOpmeItem(
      {
        name: "Prótese",
        quantity: 2,
        manufacturers: [
          { id: "m1", name: "Stryker", cnpj: "111" },
          "Palacos",
        ],
        suppliers: [{ id: "s1", name: "Distribuidora X", cnpj: "222" }],
      },
      0,
    );

    expect(item).toEqual({
      id: "0",
      name: "Prótese",
      quantity: 2,
      manufacturers: ["Stryker", "Palacos"],
      suppliers: ["Distribuidora X"],
    });
  });

  it("aceita distributor singular no item OPME", () => {
    const items = normalizeTemplateOpmeItems([
      {
        name: "Cimento",
        quantity: 1,
        manufacturers: ["Palacos"],
        distributor: { id: "s2", name: "Fornecedor Y" },
      },
    ]);

    expect(items[0].suppliers).toEqual(["Fornecedor Y"]);
  });

  it("prepara payload de criação com opmeItems e entidades completas", () => {
    const items = extractTemplateOpmeItemsForCreate({
      opmeItems: [
        {
          name: "Prótese total de joelho",
          quantity: 1,
          manufacturers: [
            { id: "m1", name: "Stryker" },
            { id: "m2", name: "Zimmer" },
            { id: "m3", name: "DePuy" },
          ],
          suppliers: [
            { id: "s1", name: "Fornecedor A" },
            { id: "s2", name: "Fornecedor B" },
            { id: "s3", name: "Fornecedor C" },
          ],
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      name: "Prótese total de joelho",
      quantity: 1,
      manufacturerIds: ["m1", "m2", "m3"],
      manufacturerNames: [],
      supplierIds: ["s1", "s2", "s3"],
      supplierNames: [],
    });
  });

  it("completa fabricantes e fornecedores faltantes com 'Outros'", () => {
    // Caso real: o pipeline de documento manda ["Outros","Outros","Outros"],
    // a junction (opme_item_id, manufacturer_id) colapsa em uma linha só e o
    // modelo acaba guardando um fabricante. Sem repor o padding, o item nunca
    // atinge o mínimo de 3 e some ao criar a SC pelo modelo.
    const items = extractTemplateOpmeItemsForCreate({
      opmeItems: [
        {
          name: "Kit para endoscopia lombar",
          quantity: 1,
          manufacturers: [{ name: "Outros" }],
          suppliers: [
            { id: "s1", name: "Sintex" },
            { id: "s2", name: "BW Medic" },
            { id: "s3", name: "Lais Brasil" },
          ],
        },
      ],
    });

    expect(items[0].manufacturerIds).toEqual([]);
    expect(items[0].manufacturerNames).toEqual(["Outros", "Outros", "Outros"]);
    expect(items[0].supplierIds).toEqual(["s1", "s2", "s3"]);
    expect(items[0].supplierNames).toEqual([]);
  });

  it("conta ids e nomes juntos ao completar até o mínimo", () => {
    const items = extractTemplateOpmeItemsForCreate({
      opmeItems: [
        {
          name: "Parafuso pedicular",
          quantity: 1,
          manufacturers: [{ id: "m1", name: "Stryker" }, "Zimmer"],
          suppliers: [{ id: "s1", name: "Sintex" }],
        },
      ],
    });

    // 1 id + 1 nome = 2 → falta um só.
    expect(items[0].manufacturerIds).toEqual(["m1"]);
    expect(items[0].manufacturerNames).toEqual(["Zimmer", "Outros"]);
    // 1 id → faltam dois.
    expect(items[0].supplierIds).toEqual(["s1"]);
    expect(items[0].supplierNames).toEqual(["Outros", "Outros"]);
  });

  it("separa ids e nomes livres para criação", () => {
    const items = extractTemplateOpmeItemsForCreate({
      opmeItems: [
        {
          name: "Parafuso",
          quantity: 2,
          manufacturers: ["Fabricante A", "Fabricante B", "Fabricante C"],
          suppliers: ["Fornecedor X", "Fornecedor Y", "Fornecedor Z"],
        },
      ],
    });

    expect(items[0].manufacturerIds).toEqual([]);
    expect(items[0].manufacturerNames).toEqual([
      "Fabricante A",
      "Fabricante B",
      "Fabricante C",
    ]);
    expect(items[0].supplierNames).toEqual([
      "Fornecedor X",
      "Fornecedor Y",
      "Fornecedor Z",
    ]);
  });
});
