import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { useEntityDetailForm } from "../useEntityDetailForm";

type Entity = { id: string; name: string };
type Form = { name: string };

function setup(entity: Entity | null | undefined, save = vi.fn()) {
  const showToast = vi.fn();
  const hook = renderHook(
    ({ e }: { e: Entity | null | undefined }) =>
      useEntityDetailForm<Entity, Form>({
        entity: e,
        emptyForm: { name: "" },
        toForm: (x) => ({ name: x.name }),
        validate: (f) => (f.name.trim() ? null : "Nome é obrigatório."),
        normalize: (f) => ({ name: f.name.trim() }),
        save,
        showToast,
        successMessage: "Salvo!",
        backHref: "/lista",
      }),
    { initialProps: { e: entity } },
  );
  return { ...hook, save, showToast };
}

describe("useEntityDetailForm", () => {
  beforeEach(() => push.mockClear());

  it("preenche o formulário quando a entidade chega e não sobrescreve depois", () => {
    const { result, rerender } = setup(undefined);
    expect(result.current.formData).toEqual({ name: "" });
    rerender({ e: { id: "1", name: "Alfa" } });
    expect(result.current.formData).toEqual({ name: "Alfa" });
    act(() => result.current.setField("name", "Alfa editado"));
    rerender({ e: { id: "1", name: "Alfa (refetch)" } });
    expect(result.current.formData.name).toBe("Alfa editado");
    expect(result.current.isDirty).toBe(true);
  });

  it("valida, normaliza, salva e marca como limpo", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, showToast } = setup({ id: "1", name: "Alfa" }, save);
    act(() => result.current.setField("name", "   "));
    await act(() => result.current.handleSave());
    expect(showToast).toHaveBeenCalledWith("Nome é obrigatório.", "error");
    expect(save).not.toHaveBeenCalled();

    act(() => result.current.setField("name", "  Beta  "));
    await act(() => result.current.handleSave());
    expect(save).toHaveBeenCalledWith({ id: "1", name: "Alfa" }, {
      name: "Beta",
    });
    expect(result.current.formData.name).toBe("Beta");
    expect(result.current.isDirty).toBe(false);
    expect(showToast).toHaveBeenLastCalledWith("Salvo!", "success");
  });

  it("erro ao salvar avisa e mantém a edição", async () => {
    const save = vi.fn().mockRejectedValue(new Error("500"));
    const { result, showToast } = setup({ id: "1", name: "Alfa" }, save);
    act(() => result.current.setField("name", "Gama"));
    await act(() => result.current.handleSave());
    expect(showToast).toHaveBeenCalledWith(
      "Erro ao salvar as alterações.",
      "error",
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("cancelar descarta a edição; sem edição, volta à lista", () => {
    const { result } = setup({ id: "1", name: "Alfa" });
    act(() => result.current.setField("name", "X"));
    act(() => result.current.handleCancel());
    expect(result.current.formData.name).toBe("Alfa");
    expect(push).not.toHaveBeenCalled();
    act(() => result.current.handleCancel());
    expect(push).toHaveBeenCalledWith("/lista");
  });
});
