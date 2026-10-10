import type React from "react";
import type { ReactNode } from "react";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";
import { useMedicalReportSignature } from "../medical-report/useMedicalReportSignature";

const mocks = vi.hoisted(() => ({
  getHeader: vi.fn(),
  updateDoctorProfile: vi.fn(),
  uploadSingle: vi.fn(),
  removeBackground: vi.fn(),
}));

vi.mock("@/services/doctor-header.service", () => ({
  doctorHeaderService: { get: mocks.getHeader },
}));
vi.mock("@/services/user.service", () => ({
  userService: { updateDoctorProfile: mocks.updateDoctorProfile },
}));
vi.mock("@/services/upload.service", () => ({
  uploadService: { uploadSingle: mocks.uploadSingle },
}));
vi.mock("@/lib/utils", () => ({ removeBackground: mocks.removeBackground }));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <TestProviders queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
}

type Params = Parameters<typeof useMedicalReportSignature>[0];

function render(solicitacao: unknown, currentUser: unknown, onUpdate = vi.fn()) {
  const hook = renderHook(
    () =>
      useMedicalReportSignature({
        solicitacao: solicitacao as Params["solicitacao"],
        currentUser: currentUser as Params["currentUser"],
        onUpdate,
      }),
    { wrapper },
  );
  return { ...hook, onUpdate };
}

function fileEvent(file: File) {
  return {
    target: { files: [file], value: "x" },
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe("useMedicalReportSignature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHeader.mockResolvedValue({ id: "h1" });
  });

  it("usa a assinatura da solicitação e carrega o cabeçalho do próprio médico", async () => {
    const { result } = render(
      { id: 1, doctor: { id: "u1", signatureUrl: "https://sig.png" } },
      { id: "u1" },
    );
    expect(result.current.signatureUrl).toBe("https://sig.png");
    await waitFor(() =>
      expect(result.current.doctorHeader).toEqual({ id: "h1" }),
    );
    expect(result.current.isOwnDoctor).toBe(true);
    expect(result.current.isOtherDoctor).toBe(false);
  });

  it("cai para a assinatura do perfil do usuário e pede refetch uma vez", async () => {
    const { result, onUpdate, rerender } = render(
      { id: 1, doctor: { id: "u1" } },
      { id: "u1", doctorProfile: { signatureUrl: "https://perfil.png" } },
    );
    expect(result.current.signatureUrl).toBe("https://perfil.png");
    rerender();
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
  });

  it("não busca cabeçalho quando a solicitação é de outro médico", async () => {
    const { result } = render(
      { id: 1, doctor: { id: "u2", name: "Dr. X" } },
      { id: "u1" },
    );
    await waitFor(() => expect(result.current.doctorHeader).toBeNull());
    expect(mocks.getHeader).not.toHaveBeenCalled();
    expect(result.current.isOtherDoctor).toBe(true);
    expect(result.current.doctorName).toBe("Dr. X");
  });

  it("recusa assinatura maior que 2MB", async () => {
    const { result } = render({ id: 1, doctor: { id: "u2" } }, { id: "u1" });
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "a.png");
    await act(() => result.current.handleSignatureUpload(fileEvent(big)));
    expect(mocks.uploadSingle).not.toHaveBeenCalled();
    expect(
      await screen.findByText("A assinatura deve ter no máximo 2MB"),
    ).toBeInTheDocument();
  });

  it("envia a assinatura para o perfil do médico da solicitação", async () => {
    const file = new File(["x"], "a.png");
    mocks.removeBackground.mockResolvedValue(file);
    mocks.uploadSingle.mockResolvedValue({ data: { path: "signatures/a.png" } });
    mocks.updateDoctorProfile.mockResolvedValue({});
    const { result, onUpdate } = render(
      { id: 1, doctor: { id: "u2" } },
      { id: "u1" },
    );
    await act(() => result.current.handleSignatureUpload(fileEvent(file)));
    expect(mocks.uploadSingle).toHaveBeenCalledWith(file, "signatures");
    expect(mocks.updateDoctorProfile).toHaveBeenCalledWith("u2", {
      signatureImageUrl: "signatures/a.png",
    });
    expect(onUpdate).toHaveBeenCalled();
    expect(
      await screen.findByText("Assinatura adicionada com sucesso!"),
    ).toBeInTheDocument();
  });

  it("remove a assinatura", async () => {
    mocks.updateDoctorProfile.mockResolvedValue({});
    const { result, onUpdate } = render(
      { id: 1, doctor: { id: "u2" } },
      { id: "u1" },
    );
    await act(() => result.current.handleSignatureDelete());
    expect(mocks.updateDoctorProfile).toHaveBeenCalledWith("u2", {
      signatureImageUrl: null,
    });
    expect(onUpdate).toHaveBeenCalled();
    expect(await screen.findByText("Assinatura removida.")).toBeInTheDocument();
  });
});
