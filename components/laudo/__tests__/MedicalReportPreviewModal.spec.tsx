import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import type { SurgeryRequestDetail } from "@/services/surgery-request.service";
import { MedicalReportPreviewModal } from "../MedicalReportPreviewModal";

const ASSINATURA =
  "https://bucket.r2.cloudflarestorage.com/signatures/owner/assinatura.png?X-Amz-Signature=abc";

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getSections: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getById: mocks.getById,
    getSections: mocks.getSections,
  },
}));

const solicitacao = {
  id: "sc-1",
  patient: { id: "p1", name: "Maria", cpf: "12345678901" },
  doctor: {
    id: "u1",
    name: "Dr. A",
    doctorProfile: { signatureUrl: ASSINATURA },
  },
  documents: [],
} as unknown as SurgeryRequestDetail;

describe("MedicalReportPreviewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getById.mockResolvedValue(solicitacao);
    mocks.getSections.mockResolvedValue([]);
  });

  it("mostra a assinatura direto da URL assinada, sem reprocessar em canvas (que exigiria CORS do bucket)", async () => {
    const OriginalImage = window.Image;
    const criadas: HTMLImageElement[] = [];
    window.Image = class extends OriginalImage {
      constructor() {
        super();
        criadas.push(this);
      }
    } as typeof Image;

    try {
      renderWithProviders(
        <MedicalReportPreviewModal
          isOpen
          onClose={vi.fn()}
          solicitacao={solicitacao}
        />,
      );

      const assinatura = await screen.findByAltText("Assinatura do médico");
      expect(assinatura).toHaveAttribute("src", ASSINATURA);
      expect(assinatura).not.toHaveAttribute("crossorigin");
      expect(criadas.filter((img) => img.crossOrigin)).toHaveLength(0);
    } finally {
      window.Image = OriginalImage;
    }
  });
});
