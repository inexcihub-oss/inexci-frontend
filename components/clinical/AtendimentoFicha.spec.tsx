import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@testing-library/react";
import {
  AtendimentoFicha,
  FichaFields,
  FichaIndice,
  secaoPreenchida,
  temTexto,
  useSecoesDaFicha,
} from "./AtendimentoFicha";

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

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ can: () => true }),
}));

vi.mock("@/components/procedures/ProcedureQuickPickerModal", () => ({
  ProcedureQuickPickerModal: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (p: { id: string; name: string }) => void;
  }) =>
    isOpen ? (
      <button
        onClick={() => onSelect({ id: "proc-9", name: "Nome Teste" })}
      >
        selecionar procedimento de teste
      </button>
    ) : null,
}));

const fields: FichaFields = {
  anamnesis: "",
  physicalExam: "",
  diagnosis: "",
  conduct: "",
  cidCodes: [],
  surgicalIndication: false,
  procedureId: null,
  procedureName: "",
};

function renderFicha(
  over: Partial<FichaFields> = {},
  props: { readOnly?: boolean; surgeryRequestId?: string | null } = {},
  onFieldChange = vi.fn(),
) {
  return render(
    <AtendimentoFicha
      fields={{ ...fields, ...over }}
      onFieldChange={onFieldChange}
      readOnly={props.readOnly ?? false}
      surgeryRequestId={props.surgeryRequestId ?? null}
    />,
  );
}

describe("AtendimentoFicha", () => {
  it("renderiza as quatro seções clínicas", () => {
    renderFicha();

    expect(screen.getByText("Anamnese")).toBeInTheDocument();
    expect(screen.getByText("Exame físico")).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico / Hipótese")).toBeInTheDocument();
    expect(screen.getByText("Conduta / Plano")).toBeInTheDocument();
  });

  it('expõe data-tour="ficha-indicacao" no card de indicação cirúrgica', () => {
    renderFicha();

    expect(
      screen
        .getByText("Indicação cirúrgica")
        .closest('[data-tour="ficha-indicacao"]'),
    ).not.toBeNull();
  });

  describe("campo de procedimento", () => {
    it("não aparece enquanto 'paciente cirúrgico' está desmarcado", () => {
      renderFicha({ surgicalIndication: false });

      expect(
        screen.queryByRole("button", { name: /selecionar procedimento/i }),
      ).not.toBeInTheDocument();
    });

    it("aparece ao marcar 'paciente cirúrgico' e permite escolher", async () => {
      const user = userEvent.setup();
      const onFieldChange = vi.fn();
      renderFicha({ surgicalIndication: true }, {}, onFieldChange);

      await user.click(
        screen.getByRole("button", { name: /selecionar procedimento/i }),
      );
      await user.click(
        screen.getByRole("button", {
          name: /selecionar procedimento de teste/i,
        }),
      );

      expect(onFieldChange).toHaveBeenCalledWith("procedureId", "proc-9");
      expect(onFieldChange).toHaveBeenCalledWith("procedureName", "Nome Teste");
    });

    it("mostra o nome já escolhido em vez do placeholder", () => {
      renderFicha({
        surgicalIndication: true,
        procedureId: "proc-1",
        procedureName: "Artroscopia de joelho",
      });

      expect(screen.getByText("Artroscopia de joelho")).toBeInTheDocument();
    });

    it("mostra o procedimento como texto (sem botão) quando finalizada", () => {
      renderFicha(
        {
          surgicalIndication: true,
          procedureId: "proc-1",
          procedureName: "Artroscopia de joelho",
        },
        { readOnly: true, surgeryRequestId: "sc-1" },
      );

      expect(screen.getByText("Artroscopia de joelho")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /selecionar procedimento/i }),
      ).not.toBeInTheDocument();
    });
  });
  it("reúne as quatro seções num único cartão, com título de seção acessível", () => {
    renderFicha();

    const ficha = screen.getByRole("article", { name: "Ficha clínica" });
    for (const titulo of [
      "Anamnese",
      "Exame físico",
      "Diagnóstico / Hipótese",
      "Conduta / Plano",
    ]) {
      expect(
        within(ficha).getByRole("region", { name: titulo }),
      ).toBeInTheDocument();
    }
  });

  it("em leitura mostra o texto sem editor e indica seção vazia", () => {
    renderFicha(
      { anamnesis: "<p>Dor no joelho</p>" },
      { readOnly: true },
    );

    expect(screen.getByText("Dor no joelho")).toBeInTheDocument();
    expect(screen.getAllByText("Não preenchido.")).toHaveLength(3);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("AtendimentoFicha — modo foco", () => {
  it("abre a seção em tela cheia e escreve no mesmo campo", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderFicha({}, {}, onFieldChange);

    await user.click(
      screen.getByRole("button", {
        name: "Expandir Anamnese em tela cheia",
      }),
    );

    const dialogo = screen.getByRole("dialog", { name: "Anamnese" });
    await user.type(
      within(dialogo).getByLabelText(/Queixa principal/i),
      "D",
    );
    expect(onFieldChange).toHaveBeenLastCalledWith("anamnesis", "D");

    await user.click(within(dialogo).getByRole("button", { name: "Fechar" }));
    expect(
      screen.queryByRole("dialog", { name: "Anamnese" }),
    ).not.toBeInTheDocument();
  });

  it("não oferece tela cheia em ficha finalizada", () => {
    renderFicha({}, { readOnly: true });

    expect(
      screen.queryByRole("button", { name: /em tela cheia/ }),
    ).not.toBeInTheDocument();
  });
});

describe("useSecoesDaFicha — evolução livre", () => {
  const titulos = (secoes: { title: string }[]) => secoes.map((s) => s.title);

  it("em seções mostra as quatro; em leitura também, qualquer que seja o modo", () => {
    expect(
      titulos(renderHook(() => useSecoesDaFicha(fields, "secoes", false)).result.current),
    ).toEqual(["Anamnese", "Exame físico", "Diagnóstico / Hipótese", "Conduta / Plano"]);
    expect(
      renderHook(() => useSecoesDaFicha(fields, "livre", true)).result.current,
    ).toHaveLength(4);
  });

  it("no modo livre mostra só a evolução, mais as seções que já têm texto", () => {
    expect(
      titulos(renderHook(() => useSecoesDaFicha(fields, "livre", false)).result.current),
    ).toEqual(["Evolução"]);
    expect(
      titulos(
        renderHook(() =>
          useSecoesDaFicha({ ...fields, conduct: "<p>Repouso</p>" }, "livre", false),
        ).result.current,
      ),
    ).toEqual(["Evolução", "Conduta / Plano"]);
  });

  it("não some com a seção quando o médico apaga o texto dela", () => {
    const { result, rerender } = renderHook(
      ({ f }) => useSecoesDaFicha(f, "livre", false),
      { initialProps: { f: { ...fields, physicalExam: "<p>PA 12x8</p>" } } },
    );
    expect(titulos(result.current)).toContain("Exame físico");

    rerender({ f: { ...fields, physicalExam: "" } });

    expect(titulos(result.current)).toContain("Exame físico");
  });
});

describe("AtendimentoFicha — evolução livre", () => {
  it("põe o CID junto da evolução quando o diagnóstico está oculto", () => {
    const { result } = renderHook(() => useSecoesDaFicha(fields, "livre", false));
    render(
      <AtendimentoFicha
        secoes={result.current}
        fields={fields}
        onFieldChange={vi.fn()}
        readOnly={false}
        surgeryRequestId={null}
      />,
    );

    const evolucao = screen.getByRole("region", { name: "Evolução" });
    expect(within(evolucao).getByTestId("cid-picker")).toBeInTheDocument();
    expect(
      within(evolucao).getByLabelText(/Escreva o atendimento de corrido/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Exame físico" }),
    ).not.toBeInTheDocument();
  });
});

describe("FichaIndice", () => {
  it("leva o foco ao editor da seção escolhida", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FichaIndice
          fields={fields}
          mostrarIndicacao={false}
          orientation="horizontal"
        />
        <AtendimentoFicha
          fields={fields}
          onFieldChange={vi.fn()}
          readOnly={false}
          surgeryRequestId={null}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Conduta" }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Conduta, prescrição/i)).toHaveFocus(),
    );
  });

  it("rola só a área de rolagem da ficha, sem deslocar o layout em volta", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <div style={{ overflow: "hidden" }} data-testid="layout">
        <div style={{ overflowY: "auto" }} data-testid="rolagem">
          <FichaIndice
            fields={fields}
            mostrarIndicacao={false}
            orientation="vertical"
          />
          <AtendimentoFicha
            fields={fields}
            onFieldChange={vi.fn()}
            readOnly={false}
            surgeryRequestId={null}
          />
        </div>
      </div>,
    );
    const rolagem = screen.getByTestId("rolagem");
    const layout = screen.getByTestId("layout");
    Object.defineProperty(rolagem, "scrollHeight", { value: 2000 });
    Object.defineProperty(rolagem, "clientHeight", { value: 600 });
    rolagem.scrollTo = vi.fn();
    layout.scrollTo = vi.fn();
    document.getElementById("ficha-conduta")!.getBoundingClientRect = () =>
      ({ top: 900 }) as DOMRect;

    await user.click(screen.getByRole("button", { name: "Conduta" }));

    await waitFor(() => expect(rolagem.scrollTo).toHaveBeenCalled());
    expect(rolagem.scrollTo).toHaveBeenCalledWith({
      top: 900,
      behavior: "smooth",
    });
    expect(layout.scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("só lista a indicação cirúrgica quando ela aparece na ficha", () => {
    const { rerender } = render(
      <FichaIndice
        fields={fields}
        mostrarIndicacao={false}
        orientation="vertical"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Indicação cirúrgica/ }),
    ).not.toBeInTheDocument();

    rerender(
      <FichaIndice
        fields={{ ...fields, surgicalIndication: true }}
        mostrarIndicacao
        orientation="vertical"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Indicação cirúrgica (preenchida)" }),
    ).toBeInTheDocument();
  });
});

describe("preenchimento das seções", () => {
  it("ignora HTML sem texto", () => {
    expect(temTexto("")).toBe(false);
    expect(temTexto("<p></p>")).toBe(false);
    expect(temTexto("<p>&nbsp;</p>")).toBe(false);
    expect(temTexto("<p>Dor</p>")).toBe(true);
  });

  it("conta o CID como diagnóstico preenchido", () => {
    expect(secaoPreenchida(fields, "diagnosis")).toBe(false);
    expect(
      secaoPreenchida(
        { ...fields, cidCodes: [{ code: "M54.5", description: "Dor lombar" }] },
        "diagnosis",
      ),
    ).toBe(true);
  });
});
