import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FilterModal,
  FilterState,
  DEFAULT_FILTERS,
  countActiveFilters,
} from "../FilterModal";

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

/**
 * TASK-FE-I06: Filtro por médico no kanban
 * Testa a nova seção "Médico" no FilterModal e a contagem de filtros ativos.
 */
describe("FilterModal — Filtro por Médico", () => {
  const mockDoctors = [
    { id: "doc-1", name: "Dr. Silva" },
    { id: "doc-2", name: "Dra. Santos" },
    { id: "doc-3", name: "Dr. Oliveira" },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    onClear: vi.fn(),
    currentFilters: DEFAULT_FILTERS,
    availableHealthPlans: [],
    availableProcedures: [],
    availableDoctors: mockDoctors,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar seção 'Médico' quando há médicos disponíveis", () => {
    render(<FilterModal {...defaultProps} />);
    expect(screen.getByText("Médico")).toBeInTheDocument();
  });

  it("não deve renderizar seção 'Médico' quando lista está vazia", () => {
    render(<FilterModal {...defaultProps} availableDoctors={[]} />);
    expect(screen.queryByText("Médico")).not.toBeInTheDocument();
  });

  it("não deve renderizar seção 'Médico' quando prop não é passada", () => {
    const { availableDoctors: _, ...propsWithout } = defaultProps;
    render(<FilterModal {...propsWithout} />);
    expect(screen.queryByText("Médico")).not.toBeInTheDocument();
  });

  it("deve exibir campo de pesquisa com placeholder 'Pesquisar médico...'", () => {
    render(<FilterModal {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Pesquisar médico..."),
    ).toBeInTheDocument();
  });

  it("deve listar médicos ao clicar no campo de pesquisa", async () => {
    render(<FilterModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.click(searchInput);

    await waitFor(() => {
      expect(screen.getByText("Dr. Silva")).toBeInTheDocument();
      expect(screen.getByText("Dra. Santos")).toBeInTheDocument();
      expect(screen.getByText("Dr. Oliveira")).toBeInTheDocument();
    });
  });

  it("deve filtrar médicos pelo texto digitado", async () => {
    render(<FilterModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.type(searchInput, "Santos");

    await waitFor(() => {
      expect(screen.getByText("Dra. Santos")).toBeInTheDocument();
      expect(screen.queryByText("Dr. Silva")).not.toBeInTheDocument();
      expect(screen.queryByText("Dr. Oliveira")).not.toBeInTheDocument();
    });
  });

  it("deve selecionar médico e exibir tag", async () => {
    render(<FilterModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.click(searchInput);

    // Encontrar o item do dropdown e clicar
    const doctorOption = await screen.findByText("Dr. Silva");
    await userEvent.click(doctorOption);

    // Deve mostrar badge de seleção
    await waitFor(() => {
      expect(screen.getByText("1 selecionado")).toBeInTheDocument();
    });
  });

  it("deve aplicar filtro de médico ao clicar 'Mostrar resultados'", async () => {
    render(<FilterModal {...defaultProps} />);

    // Abrir dropdown e selecionar médico
    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.click(searchInput);
    const doctorOption = await screen.findByText("Dr. Silva");
    await userEvent.click(doctorOption);

    // Aplicar filtros
    await userEvent.click(screen.getByText("Mostrar resultados"));

    await waitFor(() => {
      expect(defaultProps.onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorIds: ["doc-1"],
        }),
      );
    });
  });

  it("deve permitir selecionar múltiplos médicos", async () => {
    render(<FilterModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.click(searchInput);

    // Selecionar primeiro médico
    await userEvent.click(await screen.findByText("Dr. Silva"));

    // Clicar novamente no input para reabrir dropdown
    await userEvent.click(searchInput);

    // Selecionar segundo médico
    await userEvent.click(await screen.findByText("Dra. Santos"));

    // Deve mostrar "2 selecionados"
    await waitFor(() => {
      expect(screen.getByText("2 selecionados")).toBeInTheDocument();
    });

    // Aplicar e verificar
    await userEvent.click(screen.getByText("Mostrar resultados"));

    await waitFor(() => {
      expect(defaultProps.onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorIds: expect.arrayContaining(["doc-1", "doc-2"]),
        }),
      );
    });
  });

  it("deve limpar filtro de médico ao clicar 'Limpar filtros'", async () => {
    render(<FilterModal {...defaultProps} />);

    // Selecionar um médico
    const searchInput = screen.getByPlaceholderText("Pesquisar médico...");
    await userEvent.click(searchInput);
    await userEvent.click(await screen.findByText("Dr. Silva"));

    // Limpar
    await userEvent.click(screen.getByText("Limpar filtros"));

    expect(defaultProps.onClear).toHaveBeenCalled();
  });
});

describe("countActiveFilters — com doctorIds", () => {
  it("deve contar filtro de médico como ativo", () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      doctorIds: ["doc-1"],
    };
    expect(countActiveFilters(filters)).toBe(1);
  });

  it("deve contar múltiplos filtros incluindo médico", () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      doctorIds: ["doc-1", "doc-2"],
      statuses: ["Pendente"],
      priorities: [3],
    };
    expect(countActiveFilters(filters)).toBe(3);
  });

  it("não deve contar doctorIds vazio", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
  });

  it("DEFAULT_FILTERS deve incluir doctorIds como array vazio", () => {
    expect(DEFAULT_FILTERS.doctorIds).toEqual([]);
  });
});
