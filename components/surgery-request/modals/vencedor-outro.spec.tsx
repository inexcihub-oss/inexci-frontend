import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateAuthorizationsModal } from "./UpdateAuthorizationsModal";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";

/**
 * Guarda a ligação entre a etapa 2 e a escolha do vencedor: o módulo
 * `fornecedor-vencedor` pode estar certo e a tela não oferecer a opção.
 */

vi.mock("@/services/document.service", () => ({
  documentService: { upload: vi.fn() },
  DOCUMENT_FOLDERS: {},
}));

const solicitacao = {
  id: "sr-1",
  tussItems: [{ id: "tuss-1", tussCode: "123", name: "Artroscopia" }],
  opmeItems: [
    {
      id: "opme-1",
      name: "Parafuso",
      quantity: 2,
      suppliers: [
        { id: "s-1", name: "Sintex" },
        { id: "s-2", name: "Baumer" },
      ],
    },
  ],
} as unknown as SurgeryRequestDetail;

function abrirModal() {
  return render(
    <UpdateAuthorizationsModal
      isOpen
      onClose={vi.fn()}
      onClose2={vi.fn()}
      solicitacao={solicitacao}
      onSuccess={vi.fn()}
    />,
  );
}

describe("etapa de OPME — vencedor", () => {
  it('oferece "Outro" junto dos cotados', async () => {
    const user = userEvent.setup();
    abrirModal();

    await user.click(screen.getByRole("button", { name: "Próximo" }));

    const seletor = screen.getByRole("combobox");
    expect(
      within(seletor).getByRole("option", { name: "Outro" }),
    ).toBeInTheDocument();
    expect(
      within(seletor).getByRole("option", { name: "Sintex" }),
    ).toBeInTheDocument();
  });

  it('leva "Outro" para o resumo quando é o escolhido', async () => {
    const user = userEvent.setup();
    abrirModal();

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.selectOptions(screen.getByRole("combobox"), "Outro");
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    const resumo = screen.getByText("Fornecedor selecionado").parentElement!;
    expect(within(resumo).getByText("Outro")).toBeInTheDocument();
  });
});
