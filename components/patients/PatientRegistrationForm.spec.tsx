import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/patient.service", () => ({
  patientService: { update: vi.fn() },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { getAll: vi.fn().mockResolvedValue([]) },
}));

import { patientService } from "@/services/patient.service";
import { PatientRegistrationForm } from "./PatientRegistrationForm";

const patient = {
  id: "p-1",
  name: "Ana Beatriz",
  cpf: "12345678900",
  email: "ana@exemplo.com",
  phone: "11988880000",
  birthDate: "1988-07-04",
  gender: "female",
  address: "Av. Paulista",
  addressNumber: "1000",
  addressComplement: "",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  zipCode: "01310100",
  healthPlanId: "",
  healthPlanNumber: "0099887766",
  healthPlanType: "Unimed",
  medicalNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/**
 * `Input`/`Select` não associam o `label` ao campo via `htmlFor`/`id`
 * (mesmo comportamento do formulário original em
 * `app/(dashboard)/pacientes/[id]/page.tsx`), então `getByLabelText` e
 * `getByRole(..., { name })` não enxergam o rótulo. Localiza o input pelo
 * texto do label (irmão dentro do mesmo wrapper) sem alterar o componente
 * `Input`.
 */
function fieldByLabel(text: RegExp): HTMLInputElement {
  const label = screen.getByText(text);
  const input = label.parentElement?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Campo não encontrado para o rótulo ${text}`);
  }
  return input;
}

/** Renderiza o formulário e aguarda o efeito de `healthPlanService.getAll()`
 * resolver, evitando o warning de "not wrapped in act" nos testes. */
async function renderForm(
  props: Partial<
    Parameters<typeof PatientRegistrationForm>[0]
  > = {},
) {
  const result = render(
    <PatientRegistrationForm
      patient={props.patient ?? patient}
      onSaved={props.onSaved ?? vi.fn()}
      onCancel={props.onCancel}
    />,
  );
  await act(async () => {});
  return result;
}

describe("PatientRegistrationForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preenche os campos com os dados do paciente", async () => {
    await renderForm({ onSaved: vi.fn() });

    expect(fieldByLabel(/^Nome completo/i)).toHaveValue("Ana Beatriz");
    expect(fieldByLabel(/^CPF/i)).toHaveValue("123.456.789-00");
    expect(fieldByLabel(/^Cidade/i)).toHaveValue("São Paulo");
  });

  it("mantém o botão salvar desabilitado enquanto nada muda", async () => {
    await renderForm({ onSaved: vi.fn() });

    expect(
      screen.getByRole("button", { name: /Salvar dados do paciente/i }),
    ).toBeDisabled();
  });

  it("salva as alterações e devolve o paciente atualizado", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const updated = { ...patient, phone: "11977770000" };
    (patientService.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      updated,
    );

    await renderForm({ onSaved });

    const phone = fieldByLabel(/^Telefone/i);
    await user.clear(phone);
    await user.type(phone, "11977770000");

    const save = screen.getByRole("button", {
      name: /Salvar dados do paciente/i,
    });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => {
      expect(patientService.update).toHaveBeenCalledWith(
        "p-1",
        expect.objectContaining({ phone: "11977770000", cpf: "12345678900" }),
      );
      expect(onSaved).toHaveBeenCalledWith(updated);
    });
  });

  it("bloqueia o salvamento quando o CPF é apagado", async () => {
    const user = userEvent.setup();
    await renderForm({ onSaved: vi.fn() });

    await user.clear(fieldByLabel(/^CPF/i));
    await user.click(
      screen.getByRole("button", { name: /Salvar dados do paciente/i }),
    );

    expect(patientService.update).not.toHaveBeenCalled();
    expect(await screen.findByText(/CPF é obrigatório/i)).toBeInTheDocument();
  });
});
