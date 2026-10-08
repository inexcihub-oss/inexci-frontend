import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { arquivoDeImagem } from "./foto-paciente.fixtures";

vi.mock("./WebcamCaptureModal", () => ({
  WebcamCaptureModal: ({ onCapture }: { onCapture: (f: File) => void }) => (
    <button
      type="button"
      onClick={() => onCapture(arquivoDeImagem("foto.jpg", "image/jpeg"))}
    >
      câmera falsa: usar foto
    </button>
  ),
}));

import { PatientPhotoInput } from "./PatientPhotoInput";

const arquivo = (nome: string, tipo: string, bytes = 10) =>
  arquivoDeImagem(nome, tipo, bytes);

describe("PatientPhotoInput", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:previa");
    URL.revokeObjectURL = vi.fn();
  });

  it("sem foto mostra o ícone, enviar arquivo e tirar foto", () => {
    render(<PatientPhotoInput value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Enviar arquivo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tirar foto/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover/ })).toBeNull();
  });

  it("arquivo válido vai para o formulário; inválido mostra o motivo", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<PatientPhotoInput value={null} onChange={onChange} />);
    const input = screen.getByTestId("new-patient-photo-input");

    await user.upload(input, arquivo("a.pdf", "application/pdf"));
    expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG ou WEBP");
    expect(onChange).not.toHaveBeenCalled();

    await user.upload(input, arquivo("a.png", "image/png"));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "a.png" })),
    );
  });

  it("arquivo com extensão de imagem mas conteúdo de outro tipo é recusado", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<PatientPhotoInput value={null} onChange={onChange} />);

    await user.upload(
      screen.getByTestId("new-patient-photo-input"),
      new File([new TextEncoder().encode("%PDF-1.7")], "a.png", { type: "image/png" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/não é uma imagem/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("foto da câmera também vai para o formulário", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PatientPhotoInput value={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Tirar foto/ }));
    await user.click(screen.getByRole("button", { name: "câmera falsa: usar foto" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg" }));
  });

  it("com foto mostra a prévia e permite remover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PatientPhotoInput value={arquivo("a.png", "image/png")} onChange={onChange} />);
    expect(screen.getByAltText("Prévia da foto do paciente")).toHaveAttribute("src", "blob:previa");
    await user.click(screen.getByRole("button", { name: /Remover/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
