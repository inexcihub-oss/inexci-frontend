import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

let authState: { can: (p: Permission) => boolean } = {
  can: (p: Permission) => p === Permission.ATENDIMENTO,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

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
  PRE_SURGERY_DOCUMENT_TYPES: [
    { key: "exam", label: "Exame" },
    { key: "additional_document", label: "Outros" },
  ],
}));

vi.mock("@/components/documents/DeleteDocumentModal", () => ({
  DeleteDocumentModal: () => null,
}));

import { patientDocumentService } from "@/services/document.service";
import { PatientDocuments, formatDocumentType } from "./PatientDocuments";

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
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.ATENDIMENTO };
  });

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

  it("nomeia os documentos emitidos no atendimento", async () => {
    (patientDocumentService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      doc({ id: "doc-1", name: "Receita — 30/07/2026", key: "prescription" }),
      doc({
        id: "doc-2",
        name: "Atestado — 30/07/2026",
        key: "medical_certificate",
      }),
      doc({
        id: "doc-3",
        name: "Solicitação de exames — 30/07/2026",
        key: "exam_referral",
      }),
    ]);

    render(<PatientDocuments patientId="p-1" />);

    expect(await screen.findByText("Receita")).toBeInTheDocument();
    expect(screen.getByText("Atestado médico")).toBeInTheDocument();
    expect(screen.getByText("Solicitação de exames")).toBeInTheDocument();
  });

  it("recarrega a lista quando um documento novo é emitido", async () => {
    (patientDocumentService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      doc({ id: "doc-1" }),
    ]);

    const { rerender } = render(
      <PatientDocuments patientId="p-1" refreshKey={0} />,
    );
    expect(await screen.findByText("hemograma.jpg")).toBeInTheDocument();
    expect(patientDocumentService.list).toHaveBeenCalledTimes(1);

    rerender(<PatientDocuments patientId="p-1" refreshKey={1} />);

    expect(patientDocumentService.list).toHaveBeenCalledTimes(2);
  });

  it("não renderiza nem busca documentos para quem não tem Atendimento", () => {
    authState = { can: () => false };
    const { container } = render(<PatientDocuments patientId="p-1" />);

    expect(container).toBeEmptyDOMElement();
    expect(patientDocumentService.list).not.toHaveBeenCalled();
  });
});

describe("formatDocumentType", () => {
  it("usa o rótulo da chave conhecida", () => {
    expect(formatDocumentType("exam", "exam")).toBe("Exame");
    expect(formatDocumentType("prescription", "prescription")).toBe("Receita");
  });

  it("anexo do Feegow não mostra a chave crua", () => {
    expect(formatDocumentType("feegow_12", "additional_document")).toBe(
      "Importado do Feegow",
    );
  });

  it("chave desconhecida cai no rótulo do tipo, nunca na chave", () => {
    expect(formatDocumentType("x_9", "additional_document")).toBe("Outros");
    expect(formatDocumentType("x_9")).toBe("Documento");
  });
});
