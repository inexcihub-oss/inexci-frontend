import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getMentionableUsers: vi.fn(),
    createActivity: vi.fn(),
  },
}));

import { surgeryRequestService } from "@/services/surgery-request.service";
import { ActivityComposer } from "./ActivityComposer";

const usuarios = [
  { id: "user-2", name: "Dr. Bruno", avatarUrl: null },
  { id: "user-3", name: "Ana Paula", avatarUrl: null },
];

describe("ActivityComposer", () => {
  beforeEach(() => {
    // Sem isto as chamadas vazam entre os testes e as asserções de
    // "não enviou nada" passam a ver as chamadas dos testes anteriores.
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.getMentionableUsers).mockResolvedValue(
      usuarios,
    );
    vi.mocked(surgeryRequestService.createActivity).mockResolvedValue({
      id: "act-1",
      type: "comment",
      content: "@Dr. Bruno confere?",
      createdAt: "2026-09-22T12:00:00.000Z",
      user: null,
      mentions: [{ id: "user-2", name: "Dr. Bruno" }],
    });
  });

  it("abre a lista de usuários ao digitar @", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Escreva um comentário"), "@");

    expect(
      await screen.findByRole("option", { name: /Dr. Bruno/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Ana Paula/ }),
    ).toBeInTheDocument();
  });

  it("filtra pelo que foi digitado depois do @, ignorando acento", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText("Escreva um comentário"),
      "@an",
    );

    expect(
      await screen.findByRole("option", { name: /Ana Paula/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Dr. Bruno/ })).toBeNull();
  });

  it("insere o nome no texto ao escolher da lista", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);
    const campo = screen.getByPlaceholderText("Escreva um comentário");

    await user.type(campo, "@bru");
    await user.click(await screen.findByRole("option", { name: /Dr. Bruno/ }));

    expect(campo).toHaveValue("@Dr. Bruno ");
  });

  it("envia o comentário com o id do mencionado", async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={onSent} />);
    const campo = screen.getByPlaceholderText("Escreva um comentário");

    await user.type(campo, "@bru");
    await user.click(await screen.findByRole("option", { name: /Dr. Bruno/ }));
    await user.type(campo, "confere?");
    await user.click(screen.getByRole("button", { name: "Enviar comentário" }));

    await waitFor(() => {
      expect(surgeryRequestService.createActivity).toHaveBeenCalledWith(
        "sc-1",
        "@Dr. Bruno confere?",
        ["user-2"],
      );
    });
    expect(onSent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "act-1" }),
    );
  });

  it("não envia id de menção que o usuário apagou do texto", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);
    const campo = screen.getByPlaceholderText("Escreva um comentário");

    await user.type(campo, "@bru");
    await user.click(await screen.findByRole("option", { name: /Dr. Bruno/ }));
    await user.clear(campo);
    await user.type(campo, "deixa pra lá");
    await user.click(screen.getByRole("button", { name: "Enviar comentário" }));

    await waitFor(() => {
      expect(surgeryRequestService.createActivity).toHaveBeenCalledWith(
        "sc-1",
        "deixa pra lá",
        undefined,
      );
    });
  });

  it("fecha a lista com Escape sem enviar nada", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);
    const campo = screen.getByPlaceholderText("Escreva um comentário");

    await user.type(campo, "@");
    expect(
      await screen.findByRole("option", { name: /Dr. Bruno/ }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("option")).toBeNull();
    });
    expect(surgeryRequestService.createActivity).not.toHaveBeenCalled();
  });

  it("Enter escolhe o item destacado em vez de enviar o comentário", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);
    const campo = screen.getByPlaceholderText("Escreva um comentário");

    await user.type(campo, "@");
    await screen.findByRole("option", { name: /Dr. Bruno/ });
    await user.keyboard("{Enter}");

    expect(campo).toHaveValue("@Dr. Bruno ");
    expect(surgeryRequestService.createActivity).not.toHaveBeenCalled();
  });

  it("mantém no campo a mesma escala tipográfica das mensagens", () => {
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);

    const campo = screen.getByPlaceholderText("Escreva um comentário");

    // Asserção de classe por falta de alternativa: jsdom não calcula layout,
    // então o tamanho efetivo não é observável aqui. `text-xs` é o que casa
    // com as mensagens já publicadas; `ds-input-xs` é o que neutraliza a
    // regra global que força 16px em input no mobile (anti-zoom do iOS) —
    // sem ela o texto digitado fica maior que a conversa e que o mesmo campo
    // no desktop.
    expect(campo).toHaveClass("text-xs");
    expect(campo).toHaveClass("ds-input-xs");
  });

  it("cada opção respeita o alvo de toque mínimo de 44px", async () => {
    const user = userEvent.setup();
    render(<ActivityComposer surgeryRequestId="sc-1" onSent={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Escreva um comentário"), "@");

    const opcao = await screen.findByRole("option", { name: /Dr. Bruno/ });
    expect(opcao.className).toContain("min-h-[44px]");
  });
});
