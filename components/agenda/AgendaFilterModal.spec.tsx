import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AgendaFilterModal,
  DEFAULT_AGENDA_FILTERS,
} from "./AgendaFilterModal";

function renderModal(over: Partial<Parameters<typeof AgendaFilterModal>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    onClear: vi.fn(),
    currentFilters: DEFAULT_AGENDA_FILTERS,
    doctors: [{ id: "d-1", name: "Dra. Ana" }],
    clinics: [],
    canFilterSurgeries: true,
    ...over,
  };
  render(<AgendaFilterModal {...props} />);
  return props;
}

describe("AgendaFilterModal", () => {
  it("é um dialog nomeado e aplica o rascunho", async () => {
    const user = userEvent.setup();
    const props = renderModal();

    expect(
      screen.getByRole("dialog", { name: "Filtros da agenda" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cirurgias" }));
    await user.click(screen.getByRole("button", { name: "Dra. Ana" }));
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(props.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "surgery", doctorIds: ["d-1"] }),
    );
    expect(props.onClose).toHaveBeenCalled();
  });

  it("Esc fecha sem aplicar", async () => {
    const user = userEvent.setup();
    const props = renderModal();
    await user.keyboard("{Escape}");
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it("limpar volta ao padrão e avisa o pai", async () => {
    const user = userEvent.setup();
    const props = renderModal({
      currentFilters: { ...DEFAULT_AGENDA_FILTERS, kind: "appointment" },
    });
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(props.onClear).toHaveBeenCalled();
  });
});
