import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { modoFichaKey, useModoFicha } from "./useModoFicha";

describe("useModoFicha", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("começa em seções e lembra a escolha por usuário", () => {
    const { result } = renderHook(() => useModoFicha("u-1"));
    expect(result.current.modo).toBe("secoes");

    act(() => result.current.setModo("livre"));

    expect(result.current.modo).toBe("livre");
    expect(window.localStorage.getItem(modoFichaKey("u-1"))).toBe("livre");
    expect(renderHook(() => useModoFicha("u-1")).result.current.modo).toBe(
      "livre",
    );
    expect(renderHook(() => useModoFicha("u-2")).result.current.modo).toBe(
      "secoes",
    );
  });

  it("ignora valor desconhecido salvo", () => {
    window.localStorage.setItem(modoFichaKey("u-1"), "outro");
    expect(renderHook(() => useModoFicha("u-1")).result.current.modo).toBe(
      "secoes",
    );
  });
});
