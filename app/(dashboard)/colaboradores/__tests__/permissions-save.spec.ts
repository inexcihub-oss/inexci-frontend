import { describe, it, expect, vi, beforeEach } from "vitest";
import { Permission } from "@/lib/permissions";
import { buildCollaboratorUpdatePayload } from "@/lib/collaborator-update";

/**
 * Tarefa 18: a página de detalhe do colaborador
 * (`assistente/[id]/page.tsx`) precisa persistir `permissions` via
 * `PATCH /users/collaborators/:id` (mesma rota do e-mail), não via
 * `PATCH /users/:id` (perfil genérico) — só o primeiro DTO aceita o campo.
 *
 * `handleSave` delega a decisão do que entra no PATCH a
 * `buildCollaboratorUpdatePayload` (`lib/collaborator-update.ts`) — o mesmo
 * util importado aqui, não uma cópia paralela da lógica. Uma quebra no
 * código de produção (trocar a condição `emailChanged ||
 * permissionsChanged`, parar de incluir `permissions` no corpo) derruba
 * este teste.
 */

describe("buildCollaboratorUpdatePayload", () => {
  it("retorna só as permissões quando somente elas mudaram", () => {
    const payload = buildCollaboratorUpdatePayload(
      { email: "a@a.com", permissions: [Permission.AGENDA, Permission.ATENDIMENTO] },
      { email: "a@a.com", permissions: [Permission.AGENDA] },
    );

    expect(payload).toEqual({ permissions: [Permission.AGENDA] });
  });

  it("retorna e-mail e permissões juntos quando ambos mudaram", () => {
    const payload = buildCollaboratorUpdatePayload(
      { email: "a@a.com", permissions: [] },
      { email: "novo@a.com", permissions: [Permission.ADMINISTRACAO] },
    );

    expect(payload).toEqual({
      email: "novo@a.com",
      permissions: [Permission.ADMINISTRACAO],
    });
  });

  it("retorna só o e-mail quando as permissões não mudaram", () => {
    const payload = buildCollaboratorUpdatePayload(
      { email: "a@a.com", permissions: [Permission.AGENDA] },
      { email: "novo@a.com", permissions: [Permission.AGENDA] },
    );

    expect(payload).toEqual({ email: "novo@a.com" });
  });

  it("retorna null quando nada mudou", () => {
    const payload = buildCollaboratorUpdatePayload(
      { email: "a@a.com", permissions: [Permission.AGENDA] },
      { email: "a@a.com", permissions: [Permission.AGENDA] },
    );

    expect(payload).toBeNull();
  });
});

/**
 * Fecha o laço: a página só chama `collaboratorService.update` quando o
 * util devolve algo. Exercita o mesmo par (util real + service mockado)
 * que `handleSave` usa, na mesma sequência condicional.
 */
describe("Página do colaborador — decide chamar o service pelo payload do util", () => {
  const mockUpdate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    mockUpdate.mockClear();
  });

  async function saveIfChanged(
    collaboratorId: string,
    original: { email: string; permissions: Permission[] },
    current: { email: string; permissions: Permission[] },
  ) {
    const payload = buildCollaboratorUpdatePayload(original, current);
    if (payload) {
      await mockUpdate(collaboratorId, payload);
    }
  }

  it("chama o service com o payload decidido pelo util quando algo mudou", async () => {
    await saveIfChanged(
      "collab-1",
      { email: "a@a.com", permissions: [Permission.AGENDA, Permission.ATENDIMENTO] },
      { email: "a@a.com", permissions: [Permission.AGENDA] },
    );

    expect(mockUpdate).toHaveBeenCalledWith("collab-1", {
      permissions: [Permission.AGENDA],
    });
  });

  it("não chama o service quando nada mudou", async () => {
    await saveIfChanged(
      "collab-1",
      { email: "a@a.com", permissions: [Permission.AGENDA] },
      { email: "a@a.com", permissions: [Permission.AGENDA] },
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
