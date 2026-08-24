import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NovaViaDocumentoPage from "./page";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  setScFromDocumentStorage,
} from "@/lib/sc-from-document-background";
import { criarExtracaoDemo } from "@/lib/onboarding/demo-data";

/**
 * Guard de proveniência: o botão "Criar solicitação" precisa ficar
 * desabilitado quando a extração em localStorage é a fabricada do tour
 * (`tempStoragePath === "tour-demo"`) — mesmo fora do tour (`emTour: false`),
 * porque o usuário pode ter saído do tour ainda olhando para esta tela.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
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
    localStorage.clear();
  });

  it('desabilita "Criar solicitação" quando a extração é a fabricada do tour', async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, criarExtracaoDemo());
    renderPagina();

    const botao = await screen.findByRole("button", {
      name: "Criar solicitação",
    });
    expect(botao).toBeDisabled();
  });

  it('mantém "Criar solicitação" habilitado para uma extração real', async () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      ...criarExtracaoDemo(),
      tempStoragePath: "whatsapp-tmp/doc-real.pdf",
    });
    renderPagina();

    const botao = await screen.findByRole("button", {
      name: "Criar solicitação",
    });
    expect(botao).not.toBeDisabled();
  });
});
