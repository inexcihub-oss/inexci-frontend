import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportAgendaToCsv } from "./export-agenda";
import type { Appointment } from "@/services/appointment.service";

/**
 * Mesma armadilha do relatório do kanban: o Excel em pt-BR lê o CSV pelo
 * separador de lista do locale (";"), então um arquivo separado por vírgula
 * chega com tudo numa coluna só.
 */

const atendimento = {
  id: "ap-1",
  scheduledAt: "2026-08-01T14:00:00",
  patient: { name: "Ana Souza" },
  doctorId: "doc-1",
  type: "first_visit",
  durationMinutes: 30,
  clinic: { name: "Clínica Vida" },
  status: "scheduled",
  notes: "Sem observações",
} as unknown as Appointment;

const opcoes = {
  from: "2026-08-01",
  to: "2026-08-01",
  doctorNameById: { "doc-1": "Carlos Lima" },
};

let blobs: Blob[] = [];

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

describe("exportAgendaToCsv", () => {
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

  it("separa as colunas com ponto e vírgula", async () => {
    exportAgendaToCsv([atendimento], [], opcoes);

    const linhas = (await blobs[0].text()).replace(/^﻿/, "").split("\n");
    expect(colunas(linhas[0])).toHaveLength(15);
    expect(colunas(linhas[1])).toHaveLength(15);
    expect(colunas(linhas[1])[3]).toBe("Ana Souza");
  });

  it("não quebra a linha quando a observação tem vírgula", async () => {
    exportAgendaToCsv(
      [{ ...atendimento, notes: "Jejum, trazer exames" } as Appointment],
      [],
      opcoes,
    );

    const linhas = (await blobs[0].text()).replace(/^﻿/, "").split("\n");
    expect(colunas(linhas[1])).toHaveLength(15);
    expect(linhas[1]).toContain("Jejum, trazer exames");
  });
});
