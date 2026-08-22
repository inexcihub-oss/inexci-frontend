import { describe, it, expect, vi } from "vitest";
import { fetchRequisitosPendente } from "@/services/onboarding-requirements";

const getMock = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}));

describe("fetchRequisitosPendente", () => {
  it("devolve só os rótulos bloqueantes do status Pendente", async () => {
    getMock.mockResolvedValue({
      data: [
        {
          status: 1,
          label: "Pendente",
          pendencies: [
            { key: "patient_data", label: "Dados do Paciente", blocking: true },
            { key: "hospital_data", label: "Hospital", blocking: true },
            { key: "opcional", label: "Algo opcional", blocking: false },
          ],
        },
        { status: 4, label: "Em Agendamento", pendencies: [] },
      ],
    });

    expect(await fetchRequisitosPendente()).toEqual([
      "Dados do Paciente",
      "Hospital",
    ]);
  });

  /** O tour não pode quebrar porque a API caiu — cai para lista vazia. */
  it("devolve lista vazia se a chamada falhar", async () => {
    getMock.mockRejectedValue(new Error("500"));

    expect(await fetchRequisitosPendente()).toEqual([]);
  });
});
