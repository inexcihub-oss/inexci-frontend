import type React from "react";
import type { ReactNode } from "react";
import { act, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";
import { useMedicalReportImages } from "../medical-report/useMedicalReportImages";
import { useMedicalReportPdfExport } from "../medical-report/useMedicalReportPdfExport";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  medicalReportPdf: vi.fn(),
}));

vi.mock("@/services/document.service", () => ({
  documentService: { upload: mocks.upload, delete: mocks.remove },
  DOCUMENT_FOLDERS: { REPORT: "report" },
}));
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { medicalReportPdf: mocks.medicalReportPdf },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <TestProviders queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
}

function filesEvent(files: File[]) {
  return {
    target: { files },
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe("useMedicalReportImages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ignora arquivos que não são JPG/PNG", async () => {
    const { result } = renderHook(
      () => useMedicalReportImages({ surgeryRequestId: 3, onUpdate: vi.fn() }),
      { wrapper },
    );
    await act(() =>
      result.current.handleUploadImages(
        filesEvent([new File(["x"], "laudo.pdf")]),
      ),
    );
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "1 arquivo(s) ignorado(s): apenas JPG e PNG são aceitos",
      ),
    ).toBeInTheDocument();
  });

  it("envia as imagens válidas com a chave report_images", async () => {
    mocks.upload.mockResolvedValue({});
    const onUpdate = vi.fn();
    const { result } = renderHook(
      () => useMedicalReportImages({ surgeryRequestId: 3, onUpdate }),
      { wrapper },
    );
    await act(() =>
      result.current.handleUploadImages(
        filesEvent([new File(["x"], "rx.png"), new File(["y"], "rm.jpg")]),
      ),
    );
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload.mock.calls[0][0]).toMatchObject({
      surgeryRequestId: 3,
      key: "report_images",
      name: "rx",
      folder: "report",
    });
    expect(onUpdate).toHaveBeenCalled();
    expect(result.current.isUploadingImages).toBe(false);
    expect(result.current.imageUploadItems).toEqual([]);
    expect(await screen.findByText("Arquivos enviados")).toBeInTheDocument();
  });

  it("remove uma imagem do laudo", async () => {
    mocks.remove.mockResolvedValue(undefined);
    const onUpdate = vi.fn();
    const { result } = renderHook(
      () => useMedicalReportImages({ surgeryRequestId: 3, onUpdate }),
      { wrapper },
    );
    await act(() => result.current.handleDeleteDocument("d1", "report_images"));
    expect(mocks.remove).toHaveBeenCalledWith({
      id: "d1",
      key: "report_images",
      surgeryRequestId: 3,
    });
    expect(onUpdate).toHaveBeenCalled();
    expect(result.current.isDeletingDocId).toBeNull();
  });
});

describe("useMedicalReportPdfExport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("abre o PDF numa nova aba", async () => {
    mocks.medicalReportPdf.mockResolvedValue(new Blob(["pdf"]));
    const createUrl = vi.fn(() => "blob:1");
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const { result } = renderHook(() => useMedicalReportPdfExport(9), {
      wrapper,
    });
    await act(() => result.current.handleExportPdf());
    expect(mocks.medicalReportPdf).toHaveBeenCalledWith(9);
    expect(open).toHaveBeenCalledWith("blob:1", "_blank", "noopener,noreferrer");
    expect(result.current.isExportingPdf).toBe(false);
    open.mockRestore();
  });

  it("mostra erro quando a exportação falha", async () => {
    mocks.medicalReportPdf.mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useMedicalReportPdfExport(9), {
      wrapper,
    });
    await act(() => result.current.handleExportPdf());
    expect(result.current.isExportingPdf).toBe(false);
    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
