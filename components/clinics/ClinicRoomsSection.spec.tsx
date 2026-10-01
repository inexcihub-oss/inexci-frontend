import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";

const listRooms = vi.fn();
const createRoom = vi.fn();
const updateRoom = vi.fn();
const deleteRoom = vi.fn();
vi.mock("@/services/clinic.service", () => ({
  clinicService: {
    listRooms: (...a: unknown[]) => listRooms(...a),
    createRoom: (...a: unknown[]) => createRoom(...a),
    updateRoom: (...a: unknown[]) => updateRoom(...a),
    deleteRoom: (...a: unknown[]) => deleteRoom(...a),
  },
}));

import { ClinicRoomsSection } from "./ClinicRoomsSection";

function renderSecao() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClinicRoomsSection clinicId="c-1" />
    </QueryClientProvider>,
  );
}

describe("ClinicRoomsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRooms.mockResolvedValue([
      { id: "r-1", clinicId: "c-1", name: "Consultório 01", active: true },
      { id: "r-2", clinicId: "c-1", name: "Consultório 02", active: false },
    ]);
    createRoom.mockResolvedValue({ id: "r-3" });
    updateRoom.mockResolvedValue({ id: "r-1" });
    deleteRoom.mockResolvedValue(undefined);
  });

  it("lista as salas e marca as desativadas", async () => {
    renderSecao();

    expect(await screen.findByText("Consultório 01")).toBeInTheDocument();
    expect(screen.getByText("Desativada")).toBeInTheDocument();
    expect(listRooms).toHaveBeenCalledWith("c-1");
  });

  it("sem salas explica que é opcional", async () => {
    listRooms.mockResolvedValue([]);
    renderSecao();

    expect(
      await screen.findByText("Nenhuma sala cadastrada."),
    ).toBeInTheDocument();
  });

  it("adiciona sala pelo botão e pelo Enter", async () => {
    renderSecao();
    await screen.findByText("Consultório 01");

    const campo = screen.getByLabelText("Nome da nova sala");
    fireEvent.change(campo, { target: { value: "Consultório 03" } });
    fireEvent.click(screen.getByRole("button", { name: /adicionar sala/i }));
    await waitFor(() =>
      expect(createRoom).toHaveBeenCalledWith("c-1", "Consultório 03"),
    );

    fireEvent.change(campo, { target: { value: "Sala de procedimento" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() =>
      expect(createRoom).toHaveBeenCalledWith("c-1", "Sala de procedimento"),
    );
  });

  it("não deixa adicionar nome vazio", async () => {
    renderSecao();
    await screen.findByText("Consultório 01");

    expect(
      screen.getByRole("button", { name: /adicionar sala/i }),
    ).toBeDisabled();
  });

  it("desativa e reativa", async () => {
    renderSecao();
    await screen.findByText("Consultório 01");

    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() =>
      expect(updateRoom).toHaveBeenCalledWith("c-1", "r-1", { active: false }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reativar" }));
    await waitFor(() =>
      expect(updateRoom).toHaveBeenCalledWith("c-1", "r-2", { active: true }),
    );
  });

  it("renomeia", async () => {
    renderSecao();
    await screen.findByText("Consultório 01");

    fireEvent.click(screen.getByRole("button", { name: "Renomear Consultório 01" }));
    fireEvent.change(screen.getByLabelText("Novo nome da sala Consultório 01"), {
      target: { value: "Consultório A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nome" }));

    await waitFor(() =>
      expect(updateRoom).toHaveBeenCalledWith("c-1", "r-1", {
        name: "Consultório A",
      }),
    );
  });

  it("exclui só depois de confirmar", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    renderSecao();
    await screen.findByText("Consultório 01");

    fireEvent.click(screen.getByRole("button", { name: "Excluir Consultório 01" }));
    expect(deleteRoom).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Consultório 01" }));
    await waitFor(() => expect(deleteRoom).toHaveBeenCalledWith("c-1", "r-1"));
  });

  it("mostra o erro do backend (nome repetido)", async () => {
    const erro = new AxiosError("Conflict");
    erro.response = {
      data: { message: 'Já existe uma sala chamada "Consultório 01".' },
    } as AxiosError["response"];
    createRoom.mockRejectedValue(erro);
    renderSecao();
    await screen.findByText("Consultório 01");

    fireEvent.change(screen.getByLabelText("Nome da nova sala"), {
      target: { value: "consultório 01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar sala/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Já existe/);
  });
});
