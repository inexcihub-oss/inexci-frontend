import { describe, expect, it, vi, beforeEach } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/services/clinical-snippet.service", async (original) => ({
  ...(await original<typeof import("@/services/clinical-snippet.service")>()),
  clinicalSnippetService: { create: vi.fn() },
}));

import { clinicalSnippetService } from "@/services/clinical-snippet.service";
import { SalvarTextoRapidoModal } from "./SalvarTextoRapidoModal";

describe("SalvarTextoRapidoModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salva o trecho com o atalho normalizado e fecha", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(clinicalSnippetService.create).mockResolvedValue({
      id: "s1",
      doctorId: "d-1",
      shortcut: "exame-normal",
      title: "Exame normal",
      content: "<p>Bom estado geral</p>",
      usageCount: 0,
      createdAt: "",
      updatedAt: "",
    });
    renderWithProviders(
      <SalvarTextoRapidoModal
        conteudo="<p>Bom estado geral</p>"
        doctorId="d-1"
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Bom estado geral")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Atalho"), "/Exame Normal");
    expect(screen.getByText("/exame-normal")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Título"), "Exame normal");
    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );

    await waitFor(() =>
      expect(clinicalSnippetService.create).toHaveBeenCalledWith({
        shortcut: "exame-normal",
        title: "Exame normal",
        content: "<p>Bom estado geral</p>",
        doctorId: "d-1",
      }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(
      await screen.findByText("Texto rápido /exame-normal salvo."),
    ).toBeInTheDocument();
  });

  it("valida antes de enviar e mostra o erro do servidor", async () => {
    const user = userEvent.setup();
    vi.mocked(clinicalSnippetService.create).mockRejectedValue(
      new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        data: { message: "Já existe um texto rápido com esse atalho." },
      } as AxiosResponse),
    );
    renderWithProviders(
      <SalvarTextoRapidoModal
        conteudo="<p>x</p>"
        doctorId="d-1"
        onClose={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Informe o atalho.");
    expect(clinicalSnippetService.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Atalho"), "normal");
    await user.type(screen.getByLabelText("Título"), "Normal");
    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Já existe um texto rápido com esse atalho.",
    );
  });
});
