import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/services/patient.service", () => ({
  patientService: { list: vi.fn() },
}));

import { patientService } from "@/services/patient.service";
import { mensagemCpfRepetido, useCpfRepetido } from "./useCpfRepetido";

const paciente = (id: string, name: string, cpf: string | null) =>
  ({ id, name, cpf }) as never;

describe("useCpfRepetido", () => {
  beforeEach(() => {
    vi.mocked(patientService.list).mockReset();
  });

  it("CPF incompleto não consulta", async () => {
    const { result } = renderHook(() => useCpfRepetido("086.230.617"));
    await new Promise((r) => setTimeout(r, 450));
    expect(patientService.list).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it("acha outro paciente com o mesmo CPF, com ou sem máscara", async () => {
    vi.mocked(patientService.list).mockResolvedValue({
      total: 2,
      records: [
        paciente("p-1", "Abigail Rabello", "08623061756"),
        // A busca é ILIKE: CPF que só contém os dígitos não conta.
        paciente("p-2", "Outra Pessoa", "108623061756"),
      ],
    });

    const { result } = renderHook(() => useCpfRepetido("086.230.617-56"));

    await waitFor(() =>
      expect(result.current.map((p) => p.id)).toEqual(["p-1"]),
    );
    expect(patientService.list).toHaveBeenCalledWith({
      search: "08623061756",
      take: 5,
    });
  });

  it("na edição, o próprio paciente não conta", async () => {
    vi.mocked(patientService.list).mockResolvedValue({
      total: 1,
      records: [paciente("p-1", "Abigail Rabello", "08623061756")],
    });

    const { result } = renderHook(() => useCpfRepetido("08623061756", "p-1"));

    await waitFor(() => expect(patientService.list).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it("falha de rede não vira aviso", async () => {
    vi.mocked(patientService.list).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCpfRepetido("08623061756"));
    await waitFor(() => expect(patientService.list).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});

describe("mensagemCpfRepetido", () => {
  it("nada repetido, nenhuma mensagem", () => {
    expect(mensagemCpfRepetido([])).toBeNull();
  });

  it("cita os nomes e não fala em bloquear", () => {
    expect(mensagemCpfRepetido([{ name: "Ana" }])).toBe(
      "Já existe um paciente com este CPF: Ana. Confira se não é a mesma pessoa antes de salvar.",
    );
    expect(mensagemCpfRepetido([{ name: "Ana" }, { name: "Bia" }])).toMatch(
      /^Já existem 2 pacientes com este CPF: Ana, Bia\./,
    );
  });
});
