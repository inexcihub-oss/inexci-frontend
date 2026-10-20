import { describe, it, expect, vi, beforeEach } from "vitest";
import { Permission } from "@/lib/permissions";
import { buildCollaboratorUpdatePayload } from "@/lib/collaborator-update";

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
