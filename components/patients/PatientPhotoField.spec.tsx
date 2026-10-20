import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { arquivoDeImagem } from "./foto-paciente.fixtures";

vi.mock("@/services/patient.service", () => ({
  patientService: { update: vi.fn(), discardPhoto: vi.fn() },
}));
vi.mock("./WebcamCaptureModal", () => ({
  WebcamCaptureModal: ({ onCapture }: { onCapture: (f: File) => void }) => (
    <button
      type="button"
      onClick={() => onCapture(arquivoDeImagem("cam.jpg", "image/jpeg"))}
    >
      câmera falsa: usar foto
    </button>
  ),
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
  return arquivoDeImagem(nome, tipo, bytes);
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

  it("com foto, clicar amplia a foto com trocar e remover", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);

    expect(screen.getByAltText("Foto de Ana Souza")).toHaveAttribute(
      "src",
      "https://r2/foto.png",
    );
    expect(screen.queryByRole("button", { name: /remover/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver foto" }));

    const dialogo = screen.getByRole("dialog", { name: "Foto de Ana Souza" });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trocar foto/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /tirar foto/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /remover/i })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tirar foto a partir da foto ampliada fecha a ampliada antes de abrir a câmera", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Ver foto" }));
    await user.click(screen.getByRole("button", { name: /tirar foto/i }));

    expect(
      screen.queryByRole("dialog", { name: "Foto de Ana Souza" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "câmera falsa: usar foto" }),
    ).toBeInTheDocument();
  });

  it("sem foto, clicar oferece enviar arquivo ou tirar foto", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
    const clique = vi.spyOn(input(), "click");

    await user.click(screen.getByRole("button", { name: /adicionar foto/i }));
    expect(screen.getByRole("dialog", { name: "Adicionar foto" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Enviar arquivo/ }));
    expect(clique).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Adicionar foto" })).toBeNull();
  });

  it("foto tirada pela câmera é enviada e gravada no paciente", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(uploadService.uploadSingle).mockResolvedValue({
      message: "ok",
      data: { url: "u", path: "patient-photos/o/cam.webp" },
    });
    vi.mocked(patientService.update).mockResolvedValue(comFoto as never);
    render(<PatientPhotoField patient={semFoto} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /adicionar foto/i }));
    await user.click(screen.getByRole("button", { name: /Tirar foto/ }));
    await user.click(screen.getByRole("button", { name: "câmera falsa: usar foto" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(uploadService.uploadSingle).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/jpeg" }),
      "patient-photos",
    );
    expect(patientService.update).toHaveBeenCalledWith("p-1", {
      photoPath: "patient-photos/o/cam.webp",
    });
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

  it("recusa imagem acima de 2 MB que o navegador não consegue reduzir, sem enviar nada", async () => {
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
    await user.click(screen.getByRole("button", { name: "Ver foto" }));
    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(patientService.update).not.toHaveBeenCalled();
    expect(
      screen.getByRole("group", { name: /confirmar remoção da foto/i }),
    ).toHaveTextContent(/Remover a foto de Ana Souza\?/);
    await user.click(screen.getByRole("button", { name: "Remover foto" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(semFoto));
    expect(patientService.update).toHaveBeenCalledWith("p-1", {
      photoPath: null,
    });
  });

  it("cancelar a confirmação não remove a foto e volta às ações", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ver foto" }));
    await user.click(screen.getByRole("button", { name: /remover/i }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(patientService.update).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("group", { name: /confirmar remoção/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /trocar foto/i }),
    ).toBeInTheDocument();
  });

  it("fechar a foto ampliada no meio da confirmação não remove nada e reabre sem ela", async () => {
    const user = userEvent.setup();
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ver foto" }));
    await user.click(screen.getByRole("button", { name: /remover/i }));
    await user.click(screen.getByRole("button", { name: "Fechar foto" }));
    await user.click(screen.getByRole("button", { name: "Ver foto" }));

    expect(patientService.update).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("group", { name: /confirmar remoção/i }),
    ).toBeNull();
  });

  it("erro de envio na foto ampliada aparece nela e some ao fechá-la", async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(uploadService.uploadSingle).mockRejectedValue(
      new Error("Tipo de arquivo inválido"),
    );
    render(<PatientPhotoField patient={comFoto} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ver foto" }));
    await user.upload(input(), arquivo("foto.png", "image/png"));

    const dialogo = screen.getByRole("dialog", { name: /foto de ana souza/i });
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Tipo de arquivo inválido",
    );

    await user.click(screen.getByRole("button", { name: "Fechar foto" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("erro de envio some ao reabrir a escolha de foto", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
    await user.upload(input(), arquivo("laudo.pdf", "application/pdf"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Adicionar foto" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recusa arquivo com extensão de imagem e conteúdo de outro tipo, sem enviar", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
    await user.upload(
      input(),
      new File([new TextEncoder().encode("%PDF-1.7")], "foto.png", {
        type: "image/png",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não é uma imagem JPG, PNG ou WEBP válida/,
    );
    expect(uploadService.uploadSingle).not.toHaveBeenCalled();
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
  it("PATCH falhou depois do upload: descarta a foto enviada", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadService.uploadSingle).mockResolvedValue({
      data: { path: "patient-photos/o/nova.webp", url: "u" },
    } as never);
    vi.mocked(patientService.update).mockRejectedValue(new Error("falhou"));

    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
    await user.upload(input(), arquivo("foto.png", "image/png"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(patientService.discardPhoto).toHaveBeenCalledWith(
      "patient-photos/o/nova.webp",
    );
  });

  it("upload falhou: não há o que descartar", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadService.uploadSingle).mockRejectedValue(new Error("x"));

    render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
    await user.upload(input(), arquivo("foto.png", "image/png"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(patientService.discardPhoto).not.toHaveBeenCalled();
  });

  it("foto da galeria acima de 2 MB é reduzida no navegador e enviada", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }),
    );
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage: vi.fn(), fillRect: vi.fn() } as never);
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((cb: BlobCallback) =>
        cb(new Blob([new Uint8Array(300 * 1024)], { type: "image/jpeg" })),
      );
    vi.mocked(uploadService.uploadSingle).mockResolvedValue({
      data: { path: "patient-photos/o/grande.webp", url: "u" },
    } as never);
    vi.mocked(patientService.update).mockResolvedValue(comFoto as never);

    try {
      render(<PatientPhotoField patient={semFoto} onChange={vi.fn()} />);
      await user.upload(
        input(),
        arquivo("grande.png", "image/png", 3 * 1024 * 1024),
      );

      await waitFor(() => expect(uploadService.uploadSingle).toHaveBeenCalled());
      const enviado = vi.mocked(uploadService.uploadSingle).mock
        .calls[0][0] as File;
      expect(enviado.type).toBe("image/jpeg");
      expect(enviado.name).toBe("grande.jpg");
      expect(enviado.size).toBeLessThanOrEqual(2 * 1024 * 1024);
      const canvas = toBlob.mock.contexts[0] as HTMLCanvasElement;
      expect([canvas.width, canvas.height]).toEqual([1280, 960]);
      expect(close).toHaveBeenCalled();
    } finally {
      getContext.mockRestore();
      toBlob.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
