import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TussProcedureModal } from "./TussProcedureModal";

vi.mock("@/services/tuss.service", () => ({
  tussService: {
    searchTussFromJson: vi.fn().mockResolvedValue([]),
    addProcedures: vi.fn(),
  },
}));

describe("TussProcedureModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    surgeryRequestId: "doc-draft",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve renderizar quando isOpen=false", () => {
    const { container } = render(
      <TussProcedureModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("pré-popula os procedimentos a partir de initialItems", () => {
    render(
      <TussProcedureModal
        {...defaultProps}
        initialItems={[
          { tussCode: "3.07.15.091", name: "Descompressão cervical", quantity: 2 },
        ]}
      />,
    );

    expect(screen.getByText("3.07.15.091")).toBeInTheDocument();
    expect(screen.getByText("Descompressão cervical")).toBeInTheDocument();
  });

  it("abre vazio quando initialItems não é fornecido", () => {
    render(<TussProcedureModal {...defaultProps} />);

    expect(
      screen.getByText("Nenhum procedimento selecionado"),
    ).toBeInTheDocument();
  });
});
