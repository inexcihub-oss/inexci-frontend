import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getNotificationsHealth: vi.fn(),
  listSystemJobs: vi.fn(),
  runSystemJob: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminSystem } from "./AdminSystem";

const saudavel = {
  status: "ok",
  info: {},
  error: {},
  details: {
    redis: { status: "up" },
    smtp: { status: "up" },
    twilio: { status: "up" },
  },
};

const comFalha = {
  status: "error",
  info: { redis: { status: "up" }, twilio: { status: "up" } },
  error: { smtp: { status: "down", message: "Connection timeout" } },
  details: {
    redis: { status: "up" },
    smtp: { status: "down", message: "Connection timeout" },
    twilio: { status: "up" },
  },
};

const jobs = [
  {
    key: "stale_requests",
    name: "Solicitações paradas",
    description: "Avisa sobre solicitações sem movimento",
    schedule: "Todo dia às 07:00",
    lastManualRun: {
      at: "2026-10-20T13:00:00Z",
      by: "Ana Admin",
      result: { notified: 3 },
    },
  },
  {
    key: "weekly_summary",
    name: "Resumo semanal",
    description: "E-mail com o resumo da semana",
    schedule: "Segunda às 08:00",
    lastManualRun: null,
  },
];

function erroHttp(status: number, message?: string) {
  return new AxiosError("erro", "ERR", undefined, null, {
    status,
    data: message ? { message } : {},
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.getNotificationsHealth.mockResolvedValue(saudavel);
  svc.listSystemJobs.mockResolvedValue(jobs);
});

describe("AdminSystem", () => {
  it("mostra um card por canal operando", async () => {
    renderWithProviders(<AdminSystem />);
    for (const canal of ["redis", "smtp", "twilio"]) {
      const card = await screen.findByTestId(`health-card-${canal}`);
      expect(within(card).getByText("Operando")).toBeInTheDocument();
    }
    expect(screen.getByText(/Última verificação:/)).toBeInTheDocument();
  });

  it("canal fora do ar (corpo do 503) aparece com a mensagem de erro", async () => {
    svc.getNotificationsHealth.mockResolvedValue(comFalha);
    renderWithProviders(<AdminSystem />);
    const smtp = await screen.findByTestId("health-card-smtp");
    expect(within(smtp).getByText("Fora do ar")).toBeInTheDocument();
    expect(within(smtp).getByText("Connection timeout")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("health-card-redis")).getByText("Operando"),
    ).toBeInTheDocument();
  });

  it("verificar novamente consulta de novo", async () => {
    renderWithProviders(<AdminSystem />);
    await screen.findByTestId("health-card-redis");
    svc.getNotificationsHealth.mockResolvedValue(comFalha);
    fireEvent.click(
      screen.getByRole("button", { name: /Verificar novamente/ }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId("health-card-smtp")).getByText("Fora do ar"),
      ).toBeInTheDocument(),
    );
    expect(svc.getNotificationsHealth).toHaveBeenCalledTimes(2);
  });

  it("lista as tarefas com a última execução manual", async () => {
    renderWithProviders(<AdminSystem />);
    const stale = await screen.findByTestId("job-card-stale_requests");
    expect(within(stale).getByText("Todo dia às 07:00")).toBeInTheDocument();
    expect(within(stale).getByText("Ana Admin")).toBeInTheDocument();
    expect(within(stale).getByText("3 avisos enviados")).toBeInTheDocument();
    const weekly = screen.getByTestId("job-card-weekly_summary");
    expect(
      within(weekly).getByText("Nenhuma execução manual registrada"),
    ).toBeInTheDocument();
  });

  it("executa a tarefa exigindo motivo e mostra o resultado", async () => {
    svc.runSystemJob.mockResolvedValue({ key: "stale_requests", count: 4 });
    renderWithProviders(<AdminSystem />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Executar agora: Solicitações paradas",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Executar agora" }),
    );
    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(svc.runSystemJob).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Teste após deploy" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Executar agora" }),
    );

    await waitFor(() =>
      expect(svc.runSystemJob).toHaveBeenCalledWith(
        "stale_requests",
        "Teste após deploy",
      ),
    );
    expect(await screen.findByText("4 avisos enviados")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(svc.listSystemJobs).toHaveBeenCalledTimes(2);
  });

  it("o resumo semanal avisa que manda e-mail para todos os elegíveis", async () => {
    svc.runSystemJob.mockResolvedValue({ key: "weekly_summary", count: 1 });
    renderWithProviders(<AdminSystem />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Executar agora: Resumo semanal",
      }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("todos os usuários elegíveis"),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Reenvio pedido" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Executar agora" }),
    );
    expect(await screen.findByText("1 resumo enviado")).toBeInTheDocument();
  });

  it("409 avisa que a tarefa já está em execução", async () => {
    svc.runSystemJob.mockRejectedValue(erroHttp(409));
    renderWithProviders(<AdminSystem />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Executar agora: Resumo semanal",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Reenvio pedido" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Executar agora" }),
    );
    expect(await screen.findByText(/já está em execução/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("outros erros ficam no modal", async () => {
    svc.runSystemJob.mockRejectedValue(erroHttp(500, "Falha ao enfileirar"));
    renderWithProviders(<AdminSystem />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Executar agora: Solicitações paradas",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Teste após deploy" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Executar agora" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Falha ao enfileirar",
    );
  });
});
