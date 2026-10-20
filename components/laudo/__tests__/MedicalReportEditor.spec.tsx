import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { MedicalReportEditor } from "../MedicalReportEditor";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  ctx: {
    solicitacao: {} as Record<string, unknown>,
    statusNum: 1,
    onUpdate: vi.fn(),
  },
  getSections: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/contexts/SolicitacaoContext", () => ({
  useSolicitacao: () => mocks.ctx,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { getSections: mocks.getSections },
}));
vi.mock("@/services/doctor-header.service", () => ({
  doctorHeaderService: { get: vi.fn().mockResolvedValue(null) },
}));
vi.mock("@/components/laudo/MedicalReportPreviewModal", () => ({
  MedicalReportPreviewModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Prévia aberta</div> : null,
}));

describe("MedicalReportEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ctx.statusNum = 1;
    mocks.ctx.solicitacao = {
      id: 5,
      patient: { id: "p1", name: "Maria", cpf: "12345678901" },
      doctor: { id: "u1", name: "Dr. A" },
      documents: [],
    };
    mocks.getSections.mockResolvedValue([
      { id: "s1", title: "<p>Histórico</p>", description: "<p>texto</p>" },
    ]);
  });

  it("monta os blocos do laudo e libera a prévia com paciente e seção", async () => {
    renderWithProviders(<MedicalReportEditor />);
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
    expect(screen.getByText("IDENTIFICAÇÃO DO PACIENTE")).toBeInTheDocument();
    expect(screen.getByText("SEÇÕES DO LAUDO")).toBeInTheDocument();
    expect(
      screen.getByText("IMAGENS A SEREM ANEXADAS AO LAUDO"),
    ).toBeInTheDocument();
    expect(screen.getByText("ASSINATURA DO MÉDICO")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Informações sobre as imagens do laudo"),
    ).toBeInTheDocument();
    expect(screen.getByText("2/3 obrigatórios concluídos")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("CABEÇALHO DE DOCUMENTOS")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(screen.getByText("Prévia aberta")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(mocks.push).toHaveBeenCalledWith(
      `/pacientes/p1?returnUrl=${encodeURIComponent("/solicitacao/5?tab=laudo")}`,
    );
  });

  it("em modo leitura esconde as ações de edição", async () => {
    mocks.ctx.statusNum = 2;
    renderWithProviders(<MedicalReportEditor />);
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
    expect(screen.queryByText("Adicionar Seção")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(
      screen.getByText(
        "Nenhuma assinatura registrada no momento da criação do laudo.",
      ),
    ).toBeInTheDocument();
  });

  it("bloqueia prévia e exportação sem seções", async () => {
    mocks.getSections.mockResolvedValue([]);
    renderWithProviders(<MedicalReportEditor />);
    expect(
      await screen.findByText(
        "É necessário ao menos uma seção no laudo para enviar a solicitação.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pré-visualizar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeDisabled();
  });
});
