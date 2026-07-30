import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services/document.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/document.service")
  >("@/services/document.service");
  return {
    ...actual,
    patientDocumentService: { list: vi.fn(), delete: vi.fn() },
  };
});

vi.mock("@/components/documents/DocumentUploadModal", () => ({
  DocumentUploadModal: () => null,
  PRE_SURGERY_DOCUMENT_TYPES: [{ key: "exam", label: "Exame" }],
}));

vi.mock("@/components/documents/DeleteDocumentModal", () => ({
  DeleteDocumentModal: () => null,
}));

import { patientDocumentService } from "@/services/document.service";
import { PatientDocuments } from "./PatientDocuments";

const doc = (over: Record<string, unknown>) => ({
  id: "doc-1",
  patientId: "p-1",
  clinicalRecordId: null,
  type: "exam",
  key: "exam",
  name: "hemograma.jpg",
  uri: "https://example.com/hemograma.jpg",
  createdAt: "2026-03-12T12:00:00.000Z",
  ...over,
});

describe("PatientDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca apenas os documentos anexados nesta consulta", async () => {
    (patientDocumentService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      doc({ id: "doc-1", name: "rm-joelho.pdf", clinicalRecordId: "r-1" }),
      doc({ id: "doc-2", name: "hemograma.jpg", clinicalRecordId: null }),
      doc({ id: "doc-3", name: "antigo.pdf", clinicalRecordId: "r-0" }),
    ]);

    render(<PatientDocuments patientId="p-1" clinicalRecordId="r-1" />);

    expect(await screen.findByText("rm-joelho.pdf")).toBeInTheDocument();
    const badges = screen.getAllByText("Desta consulta");
    expect(badges).toHaveLength(1);
  });

  it("não marca nada quando a ficha ainda não foi salva", async () => {
    (patientDocumentService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      doc({ id: "doc-1", clinicalRecordId: null }),
    ]);

    render(<PatientDocuments patientId="p-1" />);

    expect(await screen.findByText("hemograma.jpg")).toBeInTheDocument();
    expect(screen.queryByText("Desta consulta")).not.toBeInTheDocument();
  });
});
