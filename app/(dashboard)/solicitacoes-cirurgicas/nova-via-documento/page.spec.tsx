import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NovaViaDocumentoPage from "./page";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  clearScFromDocumentStorage,
  saveScFromDocumentHandoff,
  setScFromDocumentStorage,
} from "@/lib/sc-from-document-background";
import { criarExtracaoDemo } from "@/lib/onboarding/demo-data";
import { surgeryRequestService } from "@/services/surgery-request.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    createFromDocument: vi.fn(),
    getExtractFromDocumentStatus: vi.fn(),
  },
}));

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false }),
}));

vi.mock("@/hooks/useAvailableDoctors", () => ({
  useAvailableDoctors: () => ({ data: [{ id: "doc-1", name: "Dra. Exemplo" }] }),
}));

vi.mock("@/services/procedure.service", () => ({
  procedureService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/services/hospital.service", () => ({
  hospitalService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/lib/sc-from-document-prefetch", () => ({
  readScFromDocumentCatalogPrefetch: vi.fn(() => null),
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NovaViaDocumentoPage />
    </QueryClientProvider>,
  );
}

describe("NovaViaDocumentoPage — guard de proveniência do tour", () => {
  beforeEach(() => {
    clearScFromDocumentStorage();
    localStorage.clear();
    sessionStorage.clear();
    replace.mockReset();
    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus).mockReset();
  });

  it('desabilita "Criar solicitação" quando a extração é a fabricada do tour', async () => {
    saveScFromDocumentHandoff({
      result: criarExtracaoDemo(),
      userId: "user-1",
    });
    renderPagina();

    const botao = await screen.findByRole("button", {
      name: "Criar solicitação",
    });
    expect(botao).toBeDisabled();
  });

  it('mantém "Criar solicitação" habilitado para uma extração real', async () => {
    saveScFromDocumentHandoff({
      result: {
        ...criarExtracaoDemo(),
        tempStoragePath: "whatsapp-tmp/doc-real.pdf",
      },
      userId: "user-1",
      jobId: "job-1",
    });
    renderPagina();

    const botao = await screen.findByRole("button", {
      name: "Criar solicitação",
    });
    expect(botao).not.toBeDisabled();
    expect(document.querySelector('[data-tour="sc-documento-paciente-extraido"]')).not.toBeNull();
  });

  it("handleSubmit não chama createFromDocument mesmo se o form for submetido diretamente com dado fabricado", async () => {
    saveScFromDocumentHandoff({
      result: criarExtracaoDemo(),
      userId: "user-1",
    });
    const { container } = renderPagina();

    await screen.findByRole("button", { name: "Criar solicitação" });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(surgeryRequestService.createFromDocument).not.toHaveBeenCalled();
  });
});

describe("NovaViaDocumentoPage — recuperação da extração", () => {
  beforeEach(() => {
    clearScFromDocumentStorage();
    localStorage.clear();
    sessionStorage.clear();
    replace.mockReset();
    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus).mockReset();
  });

  it("busca o resultado na API pelo jobId quando só o registro mínimo está salvo", async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      jobId: "job-9",
      userId: "user-1",
      savedAt: Date.now(),
    });
    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus).mockResolvedValue({
      status: "done",
      result: { ...criarExtracaoDemo(), tempStoragePath: "whatsapp-tmp/x.pdf" },
    });

    renderPagina();

    await screen.findByRole("button", { name: "Criar solicitação" });
    expect(surgeryRequestService.getExtractFromDocumentStatus).toHaveBeenCalledWith(
      "job-9",
    );
  });

  it("descarta o registro de outro usuário e volta para a lista", async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      jobId: "job-9",
      userId: "outro-usuario",
      savedAt: Date.now(),
    });

    renderPagina();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/solicitacoes-cirurgicas"),
    );
    expect(surgeryRequestService.getExtractFromDocumentStatus).not.toHaveBeenCalled();
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
  });

  it("ignora o resultado completo legado salvo no navegador", async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, criarExtracaoDemo());
    sessionStorage.setItem(
      SC_FROM_DOCUMENT_EXTRACTION_KEY,
      JSON.stringify(criarExtracaoDemo()),
    );

    renderPagina();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/solicitacoes-cirurgicas"),
    );
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
  });

  it("volta para a lista quando o job não está mais disponível", async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      jobId: "job-9",
      userId: "user-1",
      savedAt: Date.now(),
    });
    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus).mockResolvedValue({
      status: "error",
      message: "expirou",
    });

    renderPagina();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/solicitacoes-cirurgicas"),
    );
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
  });
});
