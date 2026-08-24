import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const fields: FichaFields = {
  anamnesis: "",
  physicalExam: "",
  diagnosis: "",
  conduct: "",
  cidCodes: [],
  surgicalIndication: false,
};

function renderFicha(over: Partial<FichaFields> = {}) {
  return render(
    <AtendimentoFicha
      fields={{ ...fields, ...over }}
      onFieldChange={vi.fn()}
      readOnly={false}
      surgeryRequestId={null}
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
});
