import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CAPTCHA_PENDENTE_MENSAGEM,
  type TurnstileApi,
} from "@/components/cadastro/TurnstileWidget";
import CadastroPage from "./page";

const registerMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ register: registerMock }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    checkEmail: vi.fn().mockResolvedValue({ status: "available" }),
    checkPhone: vi.fn().mockResolvedValue({ status: "available" }),
  },
}));

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: vi.fn().mockResolvedValue([
      {
        id: "p1",
        slug: "starter",
        name: "Starter",
        billingPeriod: "MONTHLY",
        sortOrder: 1,
      },
    ]),
  },
}));

vi.mock("@/lib/schemas/cadastro.schema", () => ({
  step1Schema: { safeParse: () => ({ success: true }) },
  step2Schema: { safeParse: () => ({ success: true }) },
}));

vi.mock("@/components/cadastro/CadastroSteps", () => ({
  StepIndicator: () => null,
  Step1PersonalData: () => null,
  Step2Profile: () => null,
  Step3Plan: () => null,
  Benefit: () => null,
}));

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
  return { api, emitirToken: (t: string) => opcoes?.callback(t) };
}

async function irParaEtapaDoPlano() {
  const user = userEvent.setup();
  render(<CadastroPage />);
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await waitFor(() =>
    expect(screen.queryByText(/criar sua conta/i)).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  const enviar = await screen.findByRole("button", {
    name: /começar 15 dias grátis/i,
  });
  return { user, enviar };
}

async function resolverCaptchaNosDadosPessoais(
  turnstile: ReturnType<typeof instalarTurnstileFalso>,
  token = "tok-1",
) {
  const user = userEvent.setup();
  render(<CadastroPage />);
  await waitFor(() => expect(turnstile.api.render).toHaveBeenCalledTimes(1));
  act(() => turnstile.emitirToken(token));
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await waitFor(() =>
    expect(screen.queryByText(/criar sua conta/i)).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  const enviar = await screen.findByRole("button", {
    name: /começar 15 dias grátis/i,
  });
  return { user, enviar };
}

describe("CadastroPage — captcha", () => {
  beforeEach(() => {
    registerMock.mockReset();
    registerMock.mockResolvedValue(undefined);
    delete window.turnstile;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete window.turnstile;
  });

  it("sem site key não exibe o widget nem envia captchaToken", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const { user, enviar } = await irParaEtapaDoPlano();

    expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    await waitFor(() => expect(enviar).not.toBeDisabled());
    await user.click(enviar);

    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock.mock.calls[0][0]).not.toHaveProperty("captchaToken");
  });

  it("exibe o desafio nos dados pessoais e não avança sem resolvê-lo", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-1");
    const { api } = instalarTurnstileFalso();
    const user = userEvent.setup();
    render(<CadastroPage />);

    expect(screen.getByTestId("turnstile-widget")).toBeInTheDocument();
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(
      await screen.findByText(CAPTCHA_PENDENTE_MENSAGEM),
    ).toBeInTheDocument();
    expect(screen.getByText(/criar sua conta/i)).toBeInTheDocument();
  });

  it("com o desafio resolvido nos dados pessoais, envia o token sem pedir de novo no plano", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-1");
    const turnstile = instalarTurnstileFalso();
    const { user, enviar } = await resolverCaptchaNosDadosPessoais(turnstile);

    expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    await waitFor(() => expect(enviar).not.toBeDisabled());
    await user.click(enviar);

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: "tok-1" }),
      ),
    );
  });

  it("pede um desafio novo no plano quando o token expirou antes do envio", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-1");
    const turnstile = instalarTurnstileFalso();
    const { user, enviar } = await resolverCaptchaNosDadosPessoais(turnstile);

    const agora = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(agora + 5 * 60 * 1000);
    await user.click(enviar);

    expect(registerMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(CAPTCHA_PENDENTE_MENSAGEM),
    ).toBeInTheDocument();
    expect(screen.getByTestId("turnstile-widget")).toBeInTheDocument();
    await waitFor(() => expect(enviar).toBeDisabled());

    await waitFor(() => expect(turnstile.api.render).toHaveBeenCalledTimes(2));
    act(() => turnstile.emitirToken("tok-2"));
    await waitFor(() => expect(enviar).not.toBeDisabled());
    await user.click(enviar);

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: "tok-2" }),
      ),
    );
  });

  it("quando o cadastro falha, pede um desafio novo no plano (token é de uso único)", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-1");
    registerMock.mockRejectedValueOnce({
      response: { data: { message: "Verificação de segurança inválida" } },
    });
    const turnstile = instalarTurnstileFalso();
    const { user, enviar } = await resolverCaptchaNosDadosPessoais(turnstile);

    await user.click(enviar);

    expect(
      await screen.findByText("Verificação de segurança inválida"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("turnstile-widget")).toBeInTheDocument();
    await waitFor(() => expect(enviar).toBeDisabled());

    await waitFor(() => expect(turnstile.api.render).toHaveBeenCalledTimes(2));
    act(() => turnstile.emitirToken("tok-2"));
    await waitFor(() => expect(enviar).not.toBeDisabled());
    await user.click(enviar);

    await waitFor(() =>
      expect(registerMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ captchaToken: "tok-2" }),
      ),
    );
  });
});
