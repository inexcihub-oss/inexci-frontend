import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/admin-api", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { adminService } from "./admin.service";
import { adminKeys } from "@/lib/query-keys";

describe("adminService", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("redefine o acesso de um administrador com motivo", async () => {
    post.mockResolvedValue({ data: { id: "a-2", auditId: "x" } });
    await adminService.resetTeamMemberAccess("a-2", { reason: "Perdeu" });
    expect(post).toHaveBeenCalledWith("/admin/team/a-2/reset-access", {
      reason: "Perdeu",
    });
  });

  it("saúde das notificações aceita o 503 como resultado", async () => {
    get.mockResolvedValue({ data: { status: "error", details: {} } });
    await adminService.getNotificationsHealth();
    const [url, config] = get.mock.calls[0] as [
      string,
      { validateStatus: (status: number) => boolean },
    ];
    expect(url).toBe("/health/notifications/details");
    expect(config.validateStatus(503)).toBe(true);
    expect(config.validateStatus(200)).toBe(true);
    expect(config.validateStatus(500)).toBe(false);
    expect(config.validateStatus(401)).toBe(false);
  });

  it("dispara as tarefas manuais com motivo e normaliza a contagem", async () => {
    post.mockResolvedValueOnce({ data: { notified: 2 } });
    expect(await adminService.runSystemJob("stale_requests", "Teste")).toEqual({
      key: "stale_requests",
      count: 2,
    });
    expect(post).toHaveBeenLastCalledWith("/admin/check-stale-requests", {
      reason: "Teste",
    });

    post.mockResolvedValueOnce({ data: { dispatched: 7 } });
    expect(await adminService.runSystemJob("weekly_summary", "Teste")).toEqual({
      key: "weekly_summary",
      count: 7,
    });
    expect(post).toHaveBeenLastCalledWith("/admin/send-weekly-summary", {
      reason: "Teste",
    });
  });

  it("lista contas com filtros como query", async () => {
    get.mockResolvedValue({ data: { items: [], total: 0, counts: {} } });
    await adminService.listAccounts({ situation: "trial", limit: 25 });
    expect(get).toHaveBeenCalledWith("/admin/accounts", {
      params: { situation: "trial", limit: 25 },
    });
  });

  it("busca detalhe, equipe e assinatura pelo ownerId", async () => {
    get.mockResolvedValue({ data: {} });
    await adminService.getAccount("o-1");
    await adminService.getAccountTeam("o-1");
    await adminService.getAccountSubscription("o-1");
    expect(get.mock.calls.map((c) => c[0])).toEqual([
      "/admin/accounts/o-1",
      "/admin/accounts/o-1/team",
      "/admin/accounts/o-1/subscription",
    ]);
  });

  it("listAllAccounts percorre todas as páginas com o mesmo filtro", async () => {
    const page = (n: number) => Array.from({ length: n }, (_, i) => ({ i }));
    get
      .mockResolvedValueOnce({ data: { items: page(100), total: 150 } })
      .mockResolvedValueOnce({ data: { items: page(50), total: 150 } });
    const items = await adminService.listAllAccounts({ segment: "past_due" });
    expect(items).toHaveLength(150);
    expect(get.mock.calls.map((c) => c[1].params)).toEqual([
      { segment: "past_due", limit: 100, offset: 0 },
      { segment: "past_due", limit: 100, offset: 100 },
    ]);
  });

  it("codifica ids vindos da URL para não escapar do recurso", async () => {
    get.mockResolvedValue({ data: {} });
    post.mockResolvedValue({ data: {} });
    await adminService.getAccount("../team");
    await adminService.resetTeamMemberAccess("../x", { reason: "r" });
    expect(get).toHaveBeenCalledWith("/admin/accounts/..%2Fteam");
    expect(post).toHaveBeenCalledWith("/admin/team/..%2Fx/reset-access", {
      reason: "r",
    });
  });

  it("equipe manda a janela em dias e ativação usa a rota própria", async () => {
    get.mockResolvedValue({ data: {} });
    await adminService.getAccountTeam("o-1", 7);
    await adminService.getAccountActivation("o-1");
    expect(get).toHaveBeenNthCalledWith(1, "/admin/accounts/o-1/team", {
      params: { days: 7 },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/admin/accounts/o-1/activation");
  });

  it("lista o histórico de ações com os filtros como query", async () => {
    get.mockResolvedValue({ data: { items: [], total: 0 } });

    const resultado = await adminService.listAuditLogs({
      targetOwnerId: "o-1",
      limit: 20,
      offset: 40,
    });

    expect(get).toHaveBeenCalledWith("/admin/audit-logs", {
      params: { targetOwnerId: "o-1", limit: 20, offset: 40 },
    });
    expect(resultado).toEqual({ items: [], total: 0 });
  });
});

describe("adminKeys", () => {
  it("separa o cache por filtro", () => {
    expect(adminKeys.auditLogs({ limit: 10 })).not.toEqual(
      adminKeys.auditLogs({ limit: 20 }),
    );
    expect(adminKeys.auditLogs()[0]).toBe("admin");
  });
});
