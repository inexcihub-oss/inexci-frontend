import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/patient.service", () => ({
  patientService: { update: vi.fn() },
}));
vi.mock("@/services/upload.service", () => ({
  uploadService: { uploadSingle: vi.fn() },
}));

import { patientService } from "@/services/patient.service";
import { uploadService } from "@/services/upload.service";
import { PatientPhotoField } from "./PatientPhotoField";

const semFoto = { id: "p-1", name: "Ana Souza", photoUrl: null };
const comFoto = { ...semFoto, photoUrl: "https://r2/foto.png" };

function arquivo(nome: string, tipo: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], nome, { type: tipo });
}

const input = () =>
  screen.getByTestId("patient-photo-input") as HTMLInputElement;

describe("PatientPhotoField", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sem foto mostra as iniciais e o botão de adicionar", () => {
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);

    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /adicionar foto/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remover/i }),
    ).not.toBeInTheDocument();
  });

  it("com foto mostra a imagem, trocar e remover", () => {
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);

    expect(screen.getByAltText("Foto de Ana Souza")).toHaveAttribute(
      "src",
      "https://r2/foto.png",
    );
    expect(screen.getByRole("button", { name: /trocar foto/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /remover/i })).toBeVisible();
  });

  it("envia para a pasta de fotos de paciente e grava o caminho", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(uploadService.uploadSingle).mockResolvedValue({
      message: "ok",
      data: { url: "https://r2/nova.png", path: "patient-photos/o/nova.png" },
    });
    vi.mocked(patientService.update).mockResolvedValue(comFoto as never);

    render(<PatientPhotoField patient={semFoto} onChange={onChange} />);
    await user.upload(input(), arquivo("foto.png", "image/png"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(comFoto));
    expect(uploadService.uploadSingle).toHaveBeenCalledWith(
      expect.any(File),
      "patient-photos",
    );
    expect(patientService.update).toHaveBeenCalledWith("p-1", {
      photoPath: "patient-photos/o/nova.png",
    });
  });

  it("recusa arquivo que não é imagem sem enviar nada", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);

    await user.upload(input(), arquivo("laudo.pdf", "application/pdf"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /JPG, PNG ou WEBP/i,
    );
    expect(uploadService.uploadSingle).not.toHaveBeenCalled();
  });

  it("recusa imagem acima de 2 MB sem enviar nada", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);

    await user.upload(
      input(),
      arquivo("grande.png", "image/png", 2 * 1024 * 1024 + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/2 MB/);
    expect(uploadService.uploadSingle).not.toHaveBeenCalled();
  });

  it("remover grava photoPath null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(patientService.update).mockResolvedValue(semFoto as never);

    render(<PatientPhotoField patient={comFoto} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /remover/i }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(semFoto));
    expect(patientService.update).toHaveBeenCalledWith("p-1", {
      photoPath: null,
    });
  });

  it("mostra o erro do backend quando o envio falha", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(uploadService.uploadSingle).mockRejectedValue(
      new Error("falhou"),
    );

    render(<PatientPhotoField patient={semFoto} onChange={onChange} />);
    await user.upload(input(), arquivo("foto.png", "image/png"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
