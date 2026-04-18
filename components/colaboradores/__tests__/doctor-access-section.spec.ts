import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes para validar a lógica do componente DoctorAccessSection.
 * Testa a lógica pura de seleção, dirty state e payload de save.
 */

// Simula a lógica de toggle e save extraída do componente
function createAccessManager(initialActiveIds: string[]) {
  const selectedIds = new Set(initialActiveIds);
  const originalIds = new Set(initialActiveIds);

  return {
    getSelectedIds: () => new Set(selectedIds),
    toggle: (doctorId: string) => {
      if (selectedIds.has(doctorId)) {
        selectedIds.delete(doctorId);
      } else {
        selectedIds.add(doctorId);
      }
    },
    isDirty: () => {
      if (selectedIds.size !== originalIds.size) return true;
      for (const id of selectedIds) {
        if (!originalIds.has(id)) return true;
      }
      return false;
    },
    getPayload: () => [...selectedIds],
    commitSave: () => {
      originalIds.clear();
      for (const id of selectedIds) {
        originalIds.add(id);
      }
    },
  };
}

// Simula a transformação de access data para selectedIds
function extractActiveIds(
  accessList: Array<{ doctor_user_id: string; status: "active" | "inactive" }>,
): string[] {
  return accessList
    .filter((a) => a.status === "active")
    .map((a) => a.doctor_user_id);
}

describe("DoctorAccessSection — Lógica", () => {
  describe("extractActiveIds", () => {
    it("deve extrair apenas IDs ativos", () => {
      const access = [
        { doctor_user_id: "d1", status: "active" as const },
        { doctor_user_id: "d2", status: "inactive" as const },
        { doctor_user_id: "d3", status: "active" as const },
      ];
      const ids = extractActiveIds(access);
      expect(ids).toEqual(["d1", "d3"]);
    });

    it("deve retornar array vazio quando não há acessos ativos", () => {
      const access = [{ doctor_user_id: "d1", status: "inactive" as const }];
      expect(extractActiveIds(access)).toEqual([]);
    });

    it("deve retornar array vazio para lista vazia", () => {
      expect(extractActiveIds([])).toEqual([]);
    });
  });

  describe("Toggle e Dirty State", () => {
    it("não deve estar dirty no estado inicial", () => {
      const manager = createAccessManager(["d1", "d2"]);
      expect(manager.isDirty()).toBe(false);
    });

    it("deve estar dirty após adicionar um médico", () => {
      const manager = createAccessManager(["d1"]);
      manager.toggle("d2");
      expect(manager.isDirty()).toBe(true);
      expect(manager.getSelectedIds().has("d2")).toBe(true);
    });

    it("deve estar dirty após remover um médico", () => {
      const manager = createAccessManager(["d1", "d2"]);
      manager.toggle("d2");
      expect(manager.isDirty()).toBe(true);
      expect(manager.getSelectedIds().has("d2")).toBe(false);
    });

    it("NÃO deve estar dirty após toggle ida e volta", () => {
      const manager = createAccessManager(["d1", "d2"]);
      manager.toggle("d2"); // remove
      manager.toggle("d2"); // re-adiciona
      expect(manager.isDirty()).toBe(false);
    });

    it("deve funcionar com lista vazia inicial", () => {
      const manager = createAccessManager([]);
      expect(manager.isDirty()).toBe(false);
      manager.toggle("d1");
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe("Payload de save", () => {
    it("deve retornar array com IDs selecionados", () => {
      const manager = createAccessManager(["d1"]);
      manager.toggle("d2");
      manager.toggle("d3");
      const payload = manager.getPayload();
      expect(payload).toContain("d1");
      expect(payload).toContain("d2");
      expect(payload).toContain("d3");
      expect(payload).toHaveLength(3);
    });

    it("deve retornar array vazio quando todos removidos", () => {
      const manager = createAccessManager(["d1", "d2"]);
      manager.toggle("d1");
      manager.toggle("d2");
      expect(manager.getPayload()).toEqual([]);
    });

    it("após commitSave, isDirty deve voltar a false", () => {
      const manager = createAccessManager(["d1"]);
      manager.toggle("d2");
      expect(manager.isDirty()).toBe(true);
      manager.commitSave();
      expect(manager.isDirty()).toBe(false);
    });
  });

  describe("Integração com userDoctorAccessService", () => {
    const mockSetAccess = vi.fn().mockResolvedValue([]);

    beforeEach(() => {
      mockSetAccess.mockClear();
    });

    it("deve chamar setAccessForUser com IDs corretos", async () => {
      const collaboratorId = "user-001";
      const manager = createAccessManager(["d1"]);
      manager.toggle("d2");

      // Simula o handleSave
      await mockSetAccess(collaboratorId, manager.getPayload());

      expect(mockSetAccess).toHaveBeenCalledWith(
        "user-001",
        expect.arrayContaining(["d1", "d2"]),
      );
    });

    it("deve chamar setAccessForUser com array vazio para revogar todos", async () => {
      const collaboratorId = "user-002";
      const manager = createAccessManager(["d1", "d2"]);
      manager.toggle("d1");
      manager.toggle("d2");

      await mockSetAccess(collaboratorId, manager.getPayload());

      expect(mockSetAccess).toHaveBeenCalledWith("user-002", []);
    });
  });
});
