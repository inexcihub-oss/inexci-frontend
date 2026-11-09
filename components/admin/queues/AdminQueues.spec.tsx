import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AxiosError, type AxiosResponse } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getQueuesOverview: vi.fn(),
  listFailedJobs: vi.fn(),
  runQueueJobAction: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/filas",
  useSearchParams: () => new URLSearchParams(search),
}));

import { AdminQueues, FAILED_JOBS_PAGE_SIZE } from "./AdminQueues";

const queue = (over: Record<string, unknown> = {}) => ({
  name: "mail",
  label: "E-mails",
  description: "Envio de e-mails da plataforma",
  waiting: 2,
  active: 1,
  delayed: 0,
  failed: 3,
  paused: false,
  ...over,
});

const job = {
  id: "42",
  queue: "mail",
  queueLabel: "E-mails",
  name: "send-mail",
  ownerId: "o-1",
  ownerName: "Clínica Alfa",
  attemptsMade: 3,
  maxAttempts: 3,
  error: "SMTP recusou ***",
  createdAt: "2026-10-28T10:00:00Z",
  failedAt: "2026-10-28T10:05:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.getQueuesOverview.mockResolvedValue({
    queues: [
      queue(),
      queue({
        name: "whatsapp-messages",
        label: "WhatsApp",
        failed: 0,
        paused: true,
      }),
    ],
    checkedAt: "2026-10-28T12:00:00Z",
  });
  svc.listFailedJobs.mockResolvedValue({ items: [job], total: 1 });
  svc.runQueueJobAction.mockResolvedValue({
    auditLogId: "a",
    queue: "mail",
    jobId: "42",
  });
});

describe("AdminQueues", () => {
  it("mostra a situação de cada fila e as tarefas com falha, sem conteúdo do job", async () => {
    renderWithProviders(<AdminQueues />);

    const situacao = await screen.findByRole("region", {
      name: "Situação das filas",
    });
    expect(situacao).toHaveTextContent("E-mails");
    expect(situacao).toHaveTextContent("3 falhas");
    expect(situacao).toHaveTextContent(
      "2 aguardando · 1 em execução · 0 agendadas",
    );
    expect(within(situacao).getByText("Pausada")).toBeInTheDocument();

    const falhas = await screen.findByRole("region", {
      name: "Tarefas com falha",
    });
    expect(falhas).toHaveTextContent("SMTP recusou ***");
    expect(falhas).toHaveTextContent("3 de 3 tentativas");
    expect(
      within(falhas).getByRole("link", { name: "Clínica Alfa" }),
    ).toHaveAttribute("href", "/admin/clientes/o-1");
    expect(svc.listFailedJobs).toHaveBeenCalledWith({
      limit: FAILED_JOBS_PAGE_SIZE,
      offset: 0,
    });
  });

  it("tocar no card filtra as falhas pela fila", async () => {
    renderWithProviders(<AdminQueues />);
    fireEvent.click(
      await screen.findByRole("button", { name: /E-mails/, pressed: false }),
    );
    expect(replace).toHaveBeenCalledWith("/admin/filas?fila=mail", {
      scroll: false,
    });
  });

  it("fila da URL vai para a API", async () => {
    search = "fila=whatsapp-messages&pagina=2";
    renderWithProviders(<AdminQueues />);
    await waitFor(() =>
      expect(svc.listFailedJobs).toHaveBeenCalledWith({
        queue: "whatsapp-messages",
        limit: FAILED_JOBS_PAGE_SIZE,
        offset: FAILED_JOBS_PAGE_SIZE,
      }),
    );
  });

  it("tentar de novo pede motivo e chama a API", async () => {
    renderWithProviders(<AdminQueues />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Tentar de novo a tarefa 42 de E-mails",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Cliente pediu o reenvio" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Tentar de novo" }),
    );

    await waitFor(() =>
      expect(svc.runQueueJobAction).toHaveBeenCalledWith(
        "retry",
        "mail",
        "42",
        "Cliente pediu o reenvio",
      ),
    );
  });

  it("descartar avisa que não dá para desfazer", async () => {
    renderWithProviders(<AdminQueues />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Descartar a tarefa 42 de E-mails",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Não dá para desfazer.");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Envio duplicado" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Descartar" }));
    await waitFor(() =>
      expect(svc.runQueueJobAction).toHaveBeenCalledWith(
        "discard",
        "mail",
        "42",
        "Envio duplicado",
      ),
    );
  });

  it("Redis fora mostra a mensagem da API", async () => {
    svc.getQueuesOverview.mockRejectedValue(
      new AxiosError("x", "ERR", undefined, null, {
        status: 503,
        data: {
          message:
            "Não foi possível ler as filas agora. Tente novamente em instantes.",
        },
      } as AxiosResponse),
    );
    renderWithProviders(<AdminQueues />);
    expect(
      await screen.findByText(
        "Não foi possível ler as filas agora. Tente novamente em instantes.",
      ),
    ).toBeInTheDocument();
  });

  it("sem falhas mostra o estado vazio", async () => {
    svc.listFailedJobs.mockResolvedValue({ items: [], total: 0 });
    renderWithProviders(<AdminQueues />);
    expect(
      await screen.findByText("Nenhuma tarefa com falha"),
    ).toBeInTheDocument();
  });
});
