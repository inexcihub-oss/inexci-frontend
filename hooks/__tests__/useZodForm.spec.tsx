import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useZodForm } from "@/hooks/useZodForm";

const schema = z
  .object({
    name: z.string().min(3, "Nome curto"),
    email: z.string().email("E-mail inválido"),
    age: z.coerce.number().min(18, "Maior de idade"),
  })
  .strict();

describe("useZodForm", () => {
  it("aceita valores iniciais", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "", email: "", age: 0 },
      }),
    );
    expect(result.current.values).toEqual({ name: "", email: "", age: 0 });
    expect(result.current.errors).toEqual({});
  });

  it("setField atualiza valor e limpa erro do próprio campo", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "", email: "", age: 0 },
      }),
    );

    act(() => {
      result.current.validate();
    });
    expect(result.current.errors.name).toBe("Nome curto");

    act(() => {
      result.current.setField("name", "João Silva");
    });
    expect(result.current.values.name).toBe("João Silva");
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.email).toBe("E-mail inválido");
  });

  it("validate retorna success com dados parseados", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "João Silva", email: "a@b.co", age: "30" as any },
      }),
    );

    let r: ReturnType<typeof result.current.validate>;
    act(() => {
      r = result.current.validate();
    });
    expect(r!.success).toBe(true);
    if (r!.success) {
      expect(r!.data.age).toBe(30);
    }
  });

  it("handleSubmit dispara onValid se válido", async () => {
    const onValid = vi.fn();
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "João Silva", email: "a@b.co", age: "30" as any },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(onValid)({
        preventDefault: () => {},
      } as React.FormEvent);
    });

    expect(onValid).toHaveBeenCalledOnce();
    expect(onValid).toHaveBeenCalledWith({
      name: "João Silva",
      email: "a@b.co",
      age: 30,
    });
  });

  it("handleSubmit dispara onInvalid e popula errors quando inválido", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "Jo", email: "x", age: 10 as any },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledOnce();
    expect(result.current.errors.name).toBe("Nome curto");
    expect(result.current.errors.email).toBe("E-mail inválido");
    expect(result.current.errors.age).toBe("Maior de idade");
  });

  it("getFieldProps casa com onChange de input", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "", email: "", age: 0 },
      }),
    );

    const props = result.current.getFieldProps("name");
    expect(props.value).toBe("");
    expect(typeof props.onChange).toBe("function");

    act(() => {
      props.onChange({
        target: { value: "Maria Silva" },
      } as any);
    });
    expect(result.current.values.name).toBe("Maria Silva");
  });

  it("reset volta aos valores iniciais", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "", email: "", age: 0 },
      }),
    );

    act(() => {
      result.current.setField("name", "Foo Bar");
      result.current.setError("email", "custom");
    });
    expect(result.current.values.name).toBe("Foo Bar");

    act(() => {
      result.current.reset();
    });
    expect(result.current.values.name).toBe("");
    expect(result.current.errors).toEqual({});
  });

  it("validateOnChange valida a cada setField", () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema,
        initialValues: { name: "", email: "", age: 0 },
        validateOnChange: true,
      }),
    );

    act(() => {
      result.current.setField("name", "Jo");
    });
    expect(result.current.errors.name).toBe("Nome curto");

    act(() => {
      result.current.setField("name", "João Silva");
    });
    expect(result.current.errors.name).toBeUndefined();
  });
});
