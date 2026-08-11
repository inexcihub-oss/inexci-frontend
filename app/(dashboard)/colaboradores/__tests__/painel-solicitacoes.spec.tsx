import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

/**
 * Hospital e convênio são cadastros transversais: desde que criar/editar passou
 * a herdar o `@RequireAnyArea()`, quem só tem `agenda` ou `atendimento` abre a
 * tela de detalhe para corrigir um telefone.
 *
 * O painel lateral, porém, lê `GET /surgery-requests`, que exige
 * `solicitacoes`. O 403 caía no `.catch(() => {})` que existe ali por outro
 * motivo (evitar unhandled rejection no retorno antecipado) e o painel exibia
 * "0 / Nenhuma solicitação encontrada" para um hospital com 4 cirurgias.
 *
 * Os dois testes que importam são o par: **não chamar** o endpoint e **não
 * renderizar** o painel. Só esconder deixaria o 403 saindo na aba de rede a
 * cada abertura; só não chamar deixaria um painel vazio sem explicação.
 */

const { hospitalGetById, healthPlanGetById, surgeryGetAll } = vi.hoisted(() => ({
  hospitalGetById: vi.fn(),
  healthPlanGetById: vi.fn(),
  surgeryGetAll: vi.fn(),
}));

let permissions: Permission[] = [Permission.SOLICITACOES];

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: "reg-1" }),
}));

vi.mock("@/services/hospital.service", () => ({
  hospitalService: { getById: hospitalGetById },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { getById: healthPlanGetById },
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { getAll: surgeryGetAll },
  STATUS_NUMBER_TO_STRING: { 1: "Pendente" },
  STATUS_COLORS: { Pendente: { bg: "bg-gray-50", text: "text-gray-600" } },
}));

vi.mock("@/hooks/useCepLookup", () => ({
  useCepLookup: () => ({ loading: false, error: null, refresh: vi.fn() }),
}));

import HospitalDetalhePage from "../hospital/[id]/page";
import ConvenioDetalhePage from "../convenio/[id]/page";

const UMA_SOLICITACAO = {
  records: [
    {
      id: "sc-1",
      status: 1,
      procedure: { name: "Artroplastia total do joelho" },
      doctor: { name: "Dr. Carlos Mendonça" },
    },
  ],
};

const CENARIOS = [
  {
    nome: "hospital",
    Page: HospitalDetalhePage,
    getById: hospitalGetById,
    registro: { id: "reg-1", name: "Hospital Albert Einstein" },
    tituloPainel: "Cirurgias recentes",
    filtro: { hospitalId: "reg-1" },
  },
  {
    nome: "convênio",
    Page: ConvenioDetalhePage,
    getById: healthPlanGetById,
    registro: { id: "reg-1", name: "Unimed Paulistana" },
    tituloPainel: "Solicitações recentes",
    filtro: { healthPlanId: "reg-1" },
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  surgeryGetAll.mockResolvedValue(UMA_SOLICITACAO);
});

describe.each(CENARIOS)(
  "$nome — painel de solicitações por permissão",
  ({ Page, getById, registro, tituloPainel, filtro }) => {
    it("mostra o painel e busca as solicitações de quem tem a área", async () => {
      permissions = [Permission.SOLICITACOES];
      getById.mockResolvedValue(registro);

      render(<Page />);

      expect(await screen.findByText(tituloPainel)).toBeInTheDocument();
      expect(surgeryGetAll).toHaveBeenCalledWith(filtro);
      expect(
        await screen.findByText("Artroplastia total do joelho"),
      ).toBeInTheDocument();
    });

    it("esconde o painel e não chama o endpoint de quem só tem agenda", async () => {
      permissions = [Permission.AGENDA];
      getById.mockResolvedValue(registro);

      render(<Page />);

      // Espera a tela de fato carregar antes de afirmar ausência — senão o
      // teste passaria só porque ainda estava no spinner.
      expect(await screen.findByDisplayValue(registro.name)).toBeInTheDocument();
      await waitFor(() => expect(getById).toHaveBeenCalled());

      expect(surgeryGetAll).not.toHaveBeenCalled();
      expect(screen.queryByText(tituloPainel)).not.toBeInTheDocument();
      expect(
        screen.queryByText("Nenhuma solicitação encontrada."),
      ).not.toBeInTheDocument();
    });
  },
);
