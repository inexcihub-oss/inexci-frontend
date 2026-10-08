import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const service = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  apply: vi.fn(),
}));
vi.mock("@/services/clinical-document-template.service", async (orig) => {
  const real =
    await orig<typeof import("@/services/clinical-document-template.service")>();
  return { ...real, clinicalDocumentTemplateService: service };
});

import { DocumentTemplatesSettings } from "./DocumentTemplatesSettings";

const atestado = {
  id: "tpl-1",
  doctorId: "doc-1",
  kind: "medical_certificate" as const,
  name: "Atestado padrão",
  body: "Atesto {{paciente.nome}}",
  usageCount: 3,
  createdAt: "",
  updatedAt: "",
};

describe("DocumentTemplatesSettings (MIG-06)", () => {
  beforeEach(() => {
    Object.values(service).forEach((f) => f.mockReset());
    service.getAll.mockResolvedValue([atestado]);
    service.create.mockResolvedValue({});
    service.update.mockResolvedValue({});
    service.delete.mockResolvedValue(undefined);
  });

  it("lista os modelos do médico agrupados por documento", async () => {
    render(<DocumentTemplatesSettings doctorId="doc-1" />);

    expect(await screen.findByText("Atestado padrão")).toBeInTheDocument();
    expect(service.getAll).toHaveBeenCalledWith({ doctorId: "doc-1" });
    expect(screen.getByText("Pedido de exame")).toBeInTheDocument();
    expect(screen.getByText("Nenhum modelo ainda.")).toBeInTheDocument();
  });

  it("cria um modelo inserindo placeholders pelos botões", async () => {
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await screen.findByText("Atestado padrão");

    await user.click(screen.getByRole("button", { name: /Novo modelo/ }));
    await user.selectOptions(screen.getByLabelText("Documento"), "exam_referral");
    await user.type(screen.getByLabelText("Nome do modelo"), "Pedido RM");
    await user.type(screen.getByLabelText("Texto"), "Investigar ");
    await user.click(screen.getByRole("button", { name: "Nome do paciente" }));
    await user.click(screen.getByRole("button", { name: "Salvar modelo" }));

    await waitFor(() =>
      expect(service.create).toHaveBeenCalledWith({
        kind: "exam_referral",
        name: "Pedido RM",
        body: "Investigar {{paciente.nome}}",
      }),
    );
    // Recarrega a lista depois de salvar.
    await waitFor(() => expect(service.getAll).toHaveBeenCalledTimes(2));
  });

  it("os botões de placeholder têm alvo de toque de 44px no celular", async () => {
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await screen.findByText("Atestado padrão");
    await user.click(screen.getByRole("button", { name: /Novo modelo/ }));

    expect(
      screen.getByRole("button", { name: "Nome do paciente" }),
    ).toHaveClass("min-h-[44px]");
  });

  it("não salva sem nome ou texto", async () => {
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await screen.findByText("Atestado padrão");

    await user.click(screen.getByRole("button", { name: /Novo modelo/ }));
    await user.click(screen.getByRole("button", { name: "Salvar modelo" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe o nome e o texto do modelo.",
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it("edita nome e texto sem trocar o tipo", async () => {
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await user.click(
      await screen.findByRole("button", { name: "Editar Atestado padrão" }),
    );

    expect(screen.queryByLabelText("Documento")).toBeNull();
    const texto = screen.getByLabelText("Texto");
    await user.clear(texto);
    await user.type(texto, "Novo texto");
    await user.click(screen.getByRole("button", { name: "Salvar modelo" }));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith("tpl-1", {
        name: "Atestado padrão",
        body: "Novo texto",
      }),
    );
  });

  it("exclui depois de confirmar", async () => {
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await user.click(
      await screen.findByRole("button", { name: "Excluir Atestado padrão" }),
    );

    expect(
      await screen.findByText(/excluir "Atestado padrão"/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() =>
      expect(service.delete).toHaveBeenCalledWith("tpl-1"),
    );
  });

  it("mostra o erro da API ao salvar", async () => {
    service.create.mockRejectedValue({});
    const user = userEvent.setup();
    render(<DocumentTemplatesSettings doctorId="doc-1" />);
    await screen.findByText("Atestado padrão");

    await user.click(screen.getByRole("button", { name: /Novo modelo/ }));
    await user.type(screen.getByLabelText("Nome do modelo"), "X");
    await user.type(screen.getByLabelText("Texto"), "Y");
    await user.click(screen.getByRole("button", { name: "Salvar modelo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o modelo.",
    );
  });
});
