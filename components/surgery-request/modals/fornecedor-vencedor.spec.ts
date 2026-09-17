import { describe, expect, it } from "vitest";
import {
  GENERIC_SUPPLIER_VALUE,
  buildInitialSelectedOpmeSuppliers,
  buildSupplierAuthorizationPayload,
  buildSupplierOptions,
  describeSelectedSupplier,
} from "./fornecedor-vencedor";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";

/**
 * O vencedor é o fornecedor que o convênio aprovou. Duas respostas são
 * válidas: um dos cotados no item, ou "Outro" — o convênio aprovou alguém de
 * fora da lista. "Outro" é o fornecedor genérico da conta, e é assim que ele
 * aparece no dashboard e no filtro do kanban.
 */

const opmeCom = (over: Record<string, unknown> = {}) =>
  ({
    id: "opme-1",
    name: "Parafuso",
    quantity: 1,
    suppliers: [
      { id: "s-1", name: "Sintex" },
      { id: "s-2", name: "Baumer" },
    ],
    ...over,
  }) as never;

const solicitacaoCom = (opmeItems: unknown[]) =>
  ({ opmeItems }) as unknown as SurgeryRequestDetail;

describe("opções de fornecedor vencedor", () => {
  it("oferece 'Outro' mesmo quando ele não está entre os cotados", () => {
    const opcoes = buildSupplierOptions(opmeCom());

    expect(opcoes.map((o) => o.label)).toEqual(["Sintex", "Baumer", "Outro"]);
    expect(opcoes.at(-1)?.value).toBe(GENERIC_SUPPLIER_VALUE);
  });

  it("não duplica 'Outro' quando ele já está entre os cotados", () => {
    // O preenchimento automático dos slots coloca o genérico na lista quando o
    // item não tem os 3 fornecedores que a plataforma exige.
    const opcoes = buildSupplierOptions(
      opmeCom({
        suppliers: [
          { id: "s-1", name: "Sintex" },
          { id: "gen-1", name: "Outro", isGeneric: true },
        ],
      }),
    );

    expect(opcoes.filter((o) => o.value === GENERIC_SUPPLIER_VALUE)).toHaveLength(
      1,
    );
    expect(opcoes.map((o) => o.label)).toEqual(["Sintex", "Outro"]);
  });

  it("descarta cotado sem id — escolhê-lo não teria o que gravar", () => {
    const opcoes = buildSupplierOptions(
      opmeCom({ suppliers: [{ name: "Sem id" }, { id: "s-1", name: "Sintex" }] }),
    );

    expect(opcoes.map((o) => o.label)).toEqual(["Sintex", "Outro"]);
  });
});

describe("pré-seleção do vencedor", () => {
  it("mantém o que já foi escolhido antes", () => {
    const inicial = buildInitialSelectedOpmeSuppliers(
      solicitacaoCom([opmeCom({ selectedSupplierId: "s-2" })]),
    );

    expect(inicial["opme-1"]).toBe("s-2");
  });

  it("reconhece o genérico já gravado", () => {
    const inicial = buildInitialSelectedOpmeSuppliers(
      solicitacaoCom([
        opmeCom({
          selectedSupplier: { id: "gen-1", name: "Outro", isGeneric: true },
        }),
      ]),
    );

    expect(inicial["opme-1"]).toBe(GENERIC_SUPPLIER_VALUE);
  });

  /**
   * A pré-seleção pega o primeiro da lista. Se o genérico entrasse nessa
   * conta, todo rascunho — que é justamente quem tem slots preenchidos com
   * ele — entraria no dashboard como "Outro" sem ninguém ter escolhido,
   * inflando o número que o relatório existe para medir.
   */
  it("prefere um fornecedor real ao genérico", () => {
    const inicial = buildInitialSelectedOpmeSuppliers(
      solicitacaoCom([
        opmeCom({
          suppliers: [
            { id: "gen-1", name: "Outro", isGeneric: true },
            { id: "s-1", name: "Sintex" },
          ],
        }),
      ]),
    );

    expect(inicial["opme-1"]).toBe("s-1");
  });

  it("não escolhe nada quando só há o genérico cotado", () => {
    const inicial = buildInitialSelectedOpmeSuppliers(
      solicitacaoCom([
        opmeCom({ suppliers: [{ id: "gen-1", name: "Outro", isGeneric: true }] }),
      ]),
    );

    expect(inicial["opme-1"]).toBeUndefined();
  });
});

describe("payload enviado ao autorizar", () => {
  it("manda a marca do genérico, não um id que o cliente não conhece", () => {
    expect(buildSupplierAuthorizationPayload(GENERIC_SUPPLIER_VALUE)).toEqual({
      selectedSupplierIsGeneric: true,
    });
  });

  it("manda o id quando o vencedor é um cotado", () => {
    expect(buildSupplierAuthorizationPayload("s-1")).toEqual({
      selectedSupplierId: "s-1",
    });
  });

  it("não manda nada quando ninguém escolheu", () => {
    expect(buildSupplierAuthorizationPayload(undefined)).toEqual({});
    expect(buildSupplierAuthorizationPayload("")).toEqual({});
  });
});

describe("resumo da escolha", () => {
  it("mostra 'Outro' quando o vencedor veio de fora dos cotados", () => {
    expect(describeSelectedSupplier(opmeCom(), GENERIC_SUPPLIER_VALUE)).toBe(
      "Outro",
    );
  });

  it("mostra o nome do cotado escolhido", () => {
    expect(describeSelectedSupplier(opmeCom(), "s-2")).toBe("Baumer");
  });

  it("avisa quando nada foi escolhido", () => {
    expect(describeSelectedSupplier(opmeCom(), "")).toBe("Não selecionado");
  });
});
