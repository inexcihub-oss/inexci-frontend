import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  StatusTimeline,
  buildStatusDates,
  extractStatusTarget,
} from "./StatusTimeline";
import type { Activity } from "@/services/surgery-request.service";

function atividade(content: string, createdAt: string): Activity {
  return {
    id: createdAt,
    type: "status_change",
    content,
    createdAt,
    user: null,
  };
}

describe("extractStatusTarget", () => {
  it("lê o destino no formato padrão", () => {
    expect(
      extractStatusTarget('Status alterado de "Pendente" para "Enviada"'),
    ).toBe("Enviada");
  });

  it('ignora o sufixo "— Motivo: …" (regressão: a regex antiga não casava)', () => {
    expect(
      extractStatusTarget(
        'Status alterado de "Em Análise" para "Encerrada" — Motivo: paciente desistiu',
      ),
    ).toBe("Encerrada");
  });

  it("aceita o ponto final das atividades do WhatsApp", () => {
    expect(
      extractStatusTarget(
        '[WhatsApp IA] Solicitação avançada de "Enviada" para "Em Análise".',
      ),
    ).toBe("Em Análise");
  });

  it("aceita rótulo sem aspas", () => {
    expect(extractStatusTarget("Status alterado para Agendada")).toBe(
      "Agendada",
    );
  });

  it("devolve null quando não há destino", () => {
    expect(extractStatusTarget("Comentário qualquer")).toBeNull();
  });
});

describe("buildStatusDates", () => {
  it("registra a entrada no status mesmo com motivo no texto", () => {
    const datas = buildStatusDates("2026-01-01T00:00:00.000Z", [
      atividade(
        'Status alterado de "Pendente" para "Encerrada" — Motivo: duplicada',
        "2026-01-05T00:00:00.000Z",
      ),
    ]);
    expect(datas.get(1)).toBe("2026-01-01T00:00:00.000Z");
    expect(datas.get(9)).toBe("2026-01-05T00:00:00.000Z");
  });

  it("mantém a primeira entrada quando o status se repete", () => {
    const datas = buildStatusDates("2026-01-01T00:00:00.000Z", [
      atividade(
        'Status alterado de "Agendada" para "Em Agendamento"',
        "2026-01-10T00:00:00.000Z",
      ),
      atividade(
        'Status alterado de "Em Análise" para "Em Agendamento"',
        "2026-01-03T00:00:00.000Z",
      ),
    ]);
    expect(datas.get(4)).toBe("2026-01-03T00:00:00.000Z");
  });
});

describe("StatusTimeline", () => {
  it("mostra a etapa Encerrada com a data vinda de atividade com motivo", () => {
    render(
      <StatusTimeline
        currentStatus={9}
        createdAt="2026-01-01T00:00:00.000Z"
        activities={[
          atividade(
            'Status alterado de "Pendente" para "Encerrada" — Motivo: duplicada',
            "2026-01-05T12:00:00.000Z",
          ),
        ]}
      />,
    );

    expect(screen.getAllByText("Encerrada").length).toBeGreaterThan(0);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.queryByText("Realizada")).not.toBeInTheDocument();
  });
});
