import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AtendimentoFicha, FichaFields } from "./AtendimentoFicha";

// O Tiptap não roda bem no jsdom; o editor é substituído por um textarea
// controlado com o mesmo contrato (value/onChange), como em
// `AtendimentoTabs.spec.tsx`.
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

  /**
   * Âncora do tour de onboarding (trilha "atendimento", passo "indicacao")
   * em `lib/onboarding/tour-registry.ts`. Sem este teste, remover o atributo
   * (ou trocar o elemento) quebra o tour em silêncio.
   */
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
});
