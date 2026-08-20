import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// `vi.mock` é hoisted para o topo do arquivo, antes de qualquer `const` comum
// — referenciar `clinic`/`update` direto dentro da factory dispararia
// "Cannot access before initialization". `vi.hoisted` sobe a própria
// declaração junto, que é o padrão já usado em
// `colaboradores/__tests__/painel-solicitacoes.spec.tsx`.
const { update, clinic, push } = vi.hoisted(() => {
  const update = vi.fn().mockResolvedValue({});
  const push = vi.fn();
  const clinic = {
    id: "clinic-1",
    name: "Unidade Centro",
    phone: "",
    cnpj: "",
    email: "",
    zipCode: "",
    address: "",
    addressNumber: "",
    neighborhood: "",
    city: "",
    state: "",
    businessHours: {
      sun: [],
      mon: [{ start: "08:00", end: "12:00" }],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  return { update, clinic, push };
});

// `push` é compartilhado (vi.hoisted) em vez de recriado a cada chamada de
// `useRouter()` — só assim dá para afirmar, depois de interagir com a tela,
// que a navegação para fora NÃO aconteceu.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "clinic-1" }),
  useRouter: () => ({ push, back: vi.fn() }),
}));
vi.mock("@/services/clinic.service", () => ({
  clinicService: {
    getById: vi.fn().mockResolvedValue(clinic),
    update: (...args: unknown[]) => update(...args),
  },
}));

import ClinicaDetalhePage from "./page";

describe("Detalhe da clínica", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carrega os dados e a grade da clínica", async () => {
    render(<ClinicaDetalhePage />);

    expect(await screen.findByDisplayValue("Unidade Centro")).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
  });

  it("salva a grade inteira ao clicar em salvar", async () => {
    render(<ClinicaDetalhePage />);
    await screen.findByDisplayValue("Unidade Centro");

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const [id, payload] = update.mock.calls[0];
    expect(id).toBe("clinic-1");
    expect(payload.businessHours.mon).toEqual([
      { start: "08:00", end: "12:00" },
    ]);
    expect(payload.businessHours.sun).toEqual([]);
  });

  it("bloqueia o salvamento com grade inválida", async () => {
    render(<ClinicaDetalhePage />);
    await screen.findByDisplayValue("Unidade Centro");

    // Deixa o início depois do fim no bloco de segunda.
    fireEvent.change(screen.getByDisplayValue("08:00"), {
      target: { value: "13:00" },
    });

    expect(
      screen.getByText("O horário inicial deve ser menor que o final."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
  });

  it("reverte a grade junto com o formulário ao cancelar", async () => {
    render(<ClinicaDetalhePage />);
    const nomeInput = await screen.findByDisplayValue("Unidade Centro");

    // Edita um campo do formulário (isDirty) e um bloco da grade.
    fireEvent.change(nomeInput, { target: { value: "Unidade Sul" } });
    fireEvent.change(screen.getByDisplayValue("08:00"), {
      target: { value: "09:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.getByDisplayValue("Unidade Centro")).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("09:00")).not.toBeInTheDocument();
  });

  it("reverte a grade e não navega para fora ao cancelar editando só a grade", async () => {
    render(<ClinicaDetalhePage />);
    await screen.findByDisplayValue("Unidade Centro");

    // Só a grade muda — nenhum campo do formulário é tocado.
    fireEvent.change(screen.getByDisplayValue("08:00"), {
      target: { value: "10:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("10:00")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
