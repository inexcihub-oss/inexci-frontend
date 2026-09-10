import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportToCsv, exportToPdf } from "./export-surgery-requests";
import type { SurgeryRequest } from "@/types/surgery-request.types";

/**
 * O relatório do kanban é um arquivo que o usuário guarda. Entregá-lo por
 * `window.open` + `window.print()` dependia de o usuário escolher "Salvar como
 * PDF" na caixa de impressão — e morria calado atrás de um bloqueador de
 * pop-up.
 */

const solicitacoes = [
  {
    id: "1",
    protocol: "0042",
    patient: { name: "Ana Souza" },
    procedureName: "Artroscopia de joelho",
    doctor: { name: "Carlos Lima" },
    healthPlan: "Convênio Teste",
    priority: 3,
    status: "Em Análise",
    pendenciesCount: 4,
    pendenciesCompleted: 2,
    createdAt: "01/08/2026",
  },
] as unknown as SurgeryRequest[];

let blobs: Blob[] = [];

describe("exportToPdf — relatório do kanban", () => {
  beforeEach(() => {
    blobs = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:fake-url";
    });
    URL.revokeObjectURL = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("baixa um PDF de verdade em vez de abrir a caixa de impressão", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const baixados: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      if (this.download) baixados.push(this);
    });

    await exportToPdf(solicitacoes);

    expect(openSpy).not.toHaveBeenCalled();
    expect(baixados).toHaveLength(1);
    expect(baixados[0].download).toBe("solicitacoes-cirurgicas-2026-09-10.pdf");

    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe("application/pdf");
    const assinatura = new Uint8Array(await blobs[0].arrayBuffer()).slice(0, 5);
    expect(new TextDecoder().decode(assinatura)).toBe("%PDF-");
  });

  it("gera o arquivo mesmo sem nenhuma solicitação na lista", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await exportToPdf([]);

    expect(blobs).toHaveLength(1);
    expect(blobs[0].size).toBeGreaterThan(0);
  });
});

describe("exportToCsv — relatório do kanban", () => {
  beforeEach(() => {
    blobs = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:fake-url";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  /** Divide por `;` respeitando aspas, como faz a planilha. */
  function colunas(linha: string): string[] {
    const campos: string[] = [];
    let atual = "";
    let entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (entreAspas && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else {
          entreAspas = !entreAspas;
        }
      } else if (c === ";" && !entreAspas) {
        campos.push(atual);
        atual = "";
      } else {
        atual += c;
      }
    }
    campos.push(atual);
    return campos;
  }

  async function csvGerado(items: SurgeryRequest[]): Promise<string[]> {
    exportToCsv(items);
    const texto = await blobs[0].text();
    return texto.replace(/^\uFEFF/, "").split("\n");
  }

  it("separa as colunas com ponto e vírgula", async () => {
    const [cabecalho, primeira] = await csvGerado(solicitacoes);

    // O Excel em pt-BR usa a vírgula como separador decimal e lê o CSV pelo
    // separador de lista do locale (";"). Com vírgula, a planilha inteira cai
    // numa coluna só.
    expect(colunas(cabecalho)).toHaveLength(9);
    expect(cabecalho.startsWith("Protocolo;Paciente;")).toBe(true);
    expect(colunas(primeira)).toHaveLength(9);
  });

  it("não quebra a linha quando o próprio dado tem vírgula", async () => {
    const [, primeira] = await csvGerado([
      { ...solicitacoes[0], procedureName: "Artroscopia, joelho direito" },
    ] as unknown as SurgeryRequest[]);

    expect(colunas(primeira)).toHaveLength(9);
    expect(primeira).toContain("Artroscopia, joelho direito");
  });

  it("protege o dado que contém o próprio separador", async () => {
    const [, primeira] = await csvGerado([
      { ...solicitacoes[0], procedureName: "Artroscopia; joelho" },
    ] as unknown as SurgeryRequest[]);

    expect(colunas(primeira)).toHaveLength(9);
    expect(primeira).toContain('"Artroscopia; joelho"');
  });

  it("neutraliza dado que a planilha leria como fórmula", async () => {
    const [, primeira] = await csvGerado([
      { ...solicitacoes[0], procedureName: "=HYPERLINK(\"http://x\")" },
    ] as unknown as SurgeryRequest[]);

    expect(primeira).toContain("'=HYPERLINK");
  });
});
