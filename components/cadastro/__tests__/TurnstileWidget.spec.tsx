import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  TURNSTILE_SCRIPT_SRC,
  TurnstileWidget,
  getTurnstileSiteKey,
  type TurnstileApi,
} from "../TurnstileWidget";

type RenderOptions = Parameters<TurnstileApi["render"]>[1];

function instalarTurnstileFalso() {
  let opcoes: RenderOptions | null = null;
  const api = {
    render: vi.fn((_el: HTMLElement, o: RenderOptions) => {
      opcoes = o;
      return "widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  window.turnstile = api;
  return { api, opcoes: () => opcoes as RenderOptions | null };
}

describe("TurnstileWidget", () => {
  beforeEach(() => {
    delete window.turnstile;
    document
      .querySelectorAll(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)
      .forEach((s) => s.remove());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.turnstile;
  });

  it("renderiza o widget com a site key e repassa o token", async () => {
    const { api, opcoes } = instalarTurnstileFalso();
    const onTokenChange = vi.fn();

    render(<TurnstileWidget siteKey="site-1" onTokenChange={onTokenChange} />);

    await waitFor(() => expect(api.render).toHaveBeenCalled());
    expect(opcoes()?.sitekey).toBe("site-1");

    act(() => opcoes()?.callback("tok-1"));
    expect(onTokenChange).toHaveBeenLastCalledWith("tok-1");

    act(() => opcoes()?.["expired-callback"]());
    expect(onTokenChange).toHaveBeenLastCalledWith(null);
  });

  it("reseta o desafio e limpa o token quando o sinal muda", async () => {
    const { api } = instalarTurnstileFalso();
    const onTokenChange = vi.fn();

    const { rerender } = render(
      <TurnstileWidget siteKey="site-1" onTokenChange={onTokenChange} />,
    );
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    rerender(
      <TurnstileWidget
        siteKey="site-1"
        onTokenChange={onTokenChange}
        resetSignal={1}
      />,
    );

    expect(api.reset).toHaveBeenCalledWith("widget-1");
    expect(onTokenChange).toHaveBeenLastCalledWith(null);
  });

  it("remove o widget ao desmontar", async () => {
    const { api } = instalarTurnstileFalso();
    const { unmount } = render(
      <TurnstileWidget siteKey="site-1" onTokenChange={vi.fn()} />,
    );
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    unmount();

    expect(api.remove).toHaveBeenCalledWith("widget-1");
  });

  it("carrega o script da Cloudflare uma única vez", async () => {
    vi.resetModules();
    const { loadTurnstile: carregar } = await import("../TurnstileWidget");
    const primeira = carregar();
    const segunda = carregar();
    expect(segunda).toBe(primeira);

    const scripts = document.querySelectorAll(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    expect(scripts).toHaveLength(1);

    const { api } = instalarTurnstileFalso();
    act(() => {
      (scripts[0] as HTMLScriptElement).onload?.(new Event("load"));
    });
    await expect(primeira).resolves.toBe(api);
  });

  it("avisa quando o script não carrega", async () => {
    vi.resetModules();
    const { TurnstileWidget: Widget } = await import("../TurnstileWidget");
    render(<Widget siteKey="site-1" onTokenChange={vi.fn()} />);

    const script = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement;
    act(() => {
      script.onerror?.(new Event("error"));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /verificação de segurança/i,
    );
  });

  it("lê a site key do ambiente", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", " site-env ");
    expect(getTurnstileSiteKey()).toBe("site-env");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(getTurnstileSiteKey()).toBe("");
  });
});
