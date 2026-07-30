import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
const back = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, back, push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/atendimento/a-1",
}));

// O Tiptap não roda bem no jsdom; o editor é substituído por um textarea
// controlado com o mesmo contrato (value/onChange).
vi.mock("@/components/shared/RichTextEditor", () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? "editor"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/clinical/CidPicker", () => ({
  CidPicker: () => <div data-testid="cid-picker" />,
}));

vi.mock("@/components/clinical/PatientDocuments", () => ({
  PatientDocuments: () => <div>Documentos e exames</div>,
}));

vi.mock("@/components/patients/PatientRegistrationForm", () => ({
  PatientRegistrationForm: () => <div>Informações pessoais</div>,
}));

vi.mock("@/components/clinical/PatientHistoryTab", () => ({
  PatientHistoryTab: () => <div>Consultas e cirurgias anteriores</div>,
}));

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: {
    create: vi.fn(),
    update: vi.fn(),
    finalize: vi.fn(),
  },
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { AtendimentoTabs } from "./AtendimentoTabs";

const patient = {
  id: "p-1",
  name: "Ana Beatriz",
  cpf: "12345678900",
  phone: "11988880000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const appointment = {
  id: "a-1",
  doctorId: "d-1",
  patientId: "p-1",
  type: "return" as const,
  status: "confirmed" as const,
  scheduledAt: "2026-07-29T17:30:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
};

type Record_ = NonNullable<
  Parameters<typeof AtendimentoTabs>[0]["initialRecord"]
>;

/** Ficha persistida padrão; `over` sobrescreve o que o teste precisa variar. */
function recordFixture(over: Partial<Record_> = {}): Record_ {
  return {
    id: "r-1",
    doctorId: "d-1",
    patientId: "p-1",
    appointmentId: "a-1",
    anamnesis: null,
    physicalExam: null,
    diagnosis: null,
    cidCodes: [],
    conduct: null,
    surgicalIndication: false,
    surgeryRequestId: null,
    finalizedAt: null,
    createdAt: "2026-07-29T18:00:00.000Z",
    updatedAt: "2026-07-29T18:00:00.000Z",
    ...over,
  };
}

function renderTabs(record: Record_ | null = null) {
  return render(
    <AtendimentoTabs
      patient={patient}
      appointment={appointment}
      initialRecord={record}
    />,
  );
}

describe("AtendimentoTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it("abre na aba Atendimento com as seções clínicas", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Atendimento" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Anamnese")).toBeInTheDocument();
    expect(screen.getByText("Conduta / Plano")).toBeInTheDocument();
  });

  it("respeita a aba vinda da URL e ignora valor inválido", () => {
    searchParams = new URLSearchParams("tab=cadastro");
    const { unmount } = renderTabs();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    unmount();

    searchParams = new URLSearchParams("tab=xpto");
    renderTabs();
    expect(screen.getByRole("tab", { name: "Atendimento" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("preserva o texto digitado ao trocar de aba e voltar", async () => {
    const user = userEvent.setup();
    renderTabs();

    const anamnese = screen.getByLabelText(/Queixa principal/i);
    await user.type(anamnese, "Dor lombar há 3 meses");

    await user.click(screen.getByRole("tab", { name: "Documentos" }));
    expect(screen.getByText("Documentos e exames")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Atendimento" }));
    expect(screen.getByLabelText(/Queixa principal/i)).toHaveValue(
      "Dor lombar há 3 meses",
    );
  });

  it("reflete a aba escolhida na URL", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Histórico" }));

    expect(replace).toHaveBeenCalledWith("?tab=historico", { scroll: false });
  });

  it("mostra o indicador de não salvo ao editar e o esconde após salvar", async () => {
    const user = userEvent.setup();
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ anamnesis: "Dor lombar" }),
    );
    renderTabs();

    expect(screen.queryByText(/Alterações não salvas/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    expect(screen.getByText(/Alterações não salvas/i)).toBeInTheDocument();

    // Existem dois botões "Salvar rascunho" no DOM (versão desktop no header,
    // versão mobile no fim da aba) — jsdom não avalia media queries, então
    // ambos aparecem simultaneamente na árvore de acessibilidade, embora só um
    // fique visível por vez no navegador real. Clicamos no primeiro; os dois
    // disparam a mesma ação.
    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "p-1",
          appointmentId: "a-1",
          anamnesis: "Dor lombar",
        }),
      );
      expect(
        screen.queryByText(/Alterações não salvas/i),
      ).not.toBeInTheDocument();
    });
  });

  it("atualiza registro existente em vez de criar outro", async () => {
    const user = userEvent.setup();
    const existing = recordFixture({ anamnesis: "Inicial" });
    (clinicalRecordService.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      existing,
    );
    renderTabs(existing);

    await user.type(screen.getByLabelText(/Queixa principal/i), " + evolução");
    // Ver comentário no teste anterior: dois botões equivalentes (desktop/mobile).
    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.update).toHaveBeenCalledWith(
        "r-1",
        expect.objectContaining({ anamnesis: "Inicial + evolução" }),
      );
      expect(clinicalRecordService.create).not.toHaveBeenCalled();
    });
  });

  it("não duplica a ficha ao tentar novamente após finalize() falhar", async () => {
    const user = userEvent.setup();
    const created = recordFixture({ anamnesis: "Dor lombar" });
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      created,
    );
    // finalize() falha na primeira tentativa (rede, timeout...); persist() já
    // rodou e criou a ficha no servidor antes desse erro.
    (clinicalRecordService.finalize as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Falha de rede"),
    );
    (clinicalRecordService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...created,
      anamnesis: "Dor lombar",
    });

    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    // O erro de finalize() é mostrado ao médico (getApiErrorMessage usa a
    // própria mensagem do Error quando não é um AxiosError)...
    await screen.findByText(/Falha de rede/i);
    // ...e a ficha já criada foi registrada no estado (regressão testada aqui):
    // create() só deve ter sido chamado uma vez, mesmo após a retentativa abaixo.
    expect(clinicalRecordService.create).toHaveBeenCalledTimes(1);

    // Retentativa: "Salvar rascunho" (existem duas cópias do botão no DOM —
    // desktop/mobile — ver comentário nos testes anteriores).
    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.update).toHaveBeenCalledWith(
        "r-1",
        expect.objectContaining({ anamnesis: "Dor lombar" }),
      );
    });
    // O ponto central da regressão: create() nunca é chamado de novo.
    expect(clinicalRecordService.create).toHaveBeenCalledTimes(1);
  });

  it("em ficha finalizada esconde as ações e mantém as demais abas", () => {
    renderTabs(
      recordFixture({
        anamnesis: "<p>Fechada</p>",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );

    expect(
      screen.queryByRole("button", { name: /Salvar rascunho/i }),
    ).not.toBeInTheDocument();
    // Texto exato (em vez de regex) para não colidir com a frase do banner de
    // aviso ("Atendimento finalizado em ..."), que também contém a palavra
    // "finalizado" e é uma correspondência legítima e distinta do badge.
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toBeInTheDocument();
  });

  it("pede confirmação ao clicar em Voltar com alterações pendentes e respeita o cancelamento", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Há alterações não salvas no atendimento. Sair mesmo assim?",
    );
    expect(back).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("sai da tela ao confirmar a saída com alterações pendentes", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });
});
