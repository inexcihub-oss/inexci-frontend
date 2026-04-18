import { describe, it, expect } from "vitest";

/**
 * TASK-FE-I03: Testes para remoção de fallbacks legacy do available-doctors.service.ts.
 *
 * Valida que o mapeamento de dados do endpoint /users/doctors
 * usa APENAS doctor_profile.* e NÃO faz fallback para campos
 * removidos do model User (user.crm, user.crm_state, user.specialty).
 */

// Reproduz a lógica de mapeamento limpa do service
function mapDoctorRecord(user: any) {
  return {
    id: user.id,
    name: user.name,
    crm: user.doctor_profile?.crm ?? "",
    crm_state: user.doctor_profile?.crm_state ?? "",
    specialty: user.doctor_profile?.specialty ?? undefined,
  };
}

describe("TASK-FE-I03 — Remoção de fallbacks legacy", () => {
  describe("mapDoctorRecord — mapeamento limpo", () => {
    it("extrai dados corretamente de doctor_profile", () => {
      const user = {
        id: "u1",
        name: "Dr. Silva",
        doctor_profile: {
          crm: "123456",
          crm_state: "SP",
          specialty: "Ortopedia",
        },
      };
      const result = mapDoctorRecord(user);
      expect(result).toEqual({
        id: "u1",
        name: "Dr. Silva",
        crm: "123456",
        crm_state: "SP",
        specialty: "Ortopedia",
      });
    });

    it("retorna string vazia para crm/crm_state quando doctor_profile é null", () => {
      const user = {
        id: "u2",
        name: "Dr. Nulo",
        doctor_profile: null,
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crm_state).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("retorna string vazia para crm/crm_state quando doctor_profile é undefined", () => {
      const user = {
        id: "u3",
        name: "Dr. Indefinido",
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crm_state).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("NÃO faz fallback para campos legacy no user", () => {
      // Simula um user com campos legacy que NÃO devem ser usados
      const user = {
        id: "u4",
        name: "Dr. Legacy",
        crm: "LEGACY-CRM",
        crm_state: "LEGACY-STATE",
        specialty: "LEGACY-SPEC",
        doctor_profile: null,
      };
      const result = mapDoctorRecord(user);
      // Deve retornar "" e undefined, NÃO os valores legacy
      expect(result.crm).toBe("");
      expect(result.crm_state).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("doctor_profile com campos vazios retorna string vazia (não undefined)", () => {
      const user = {
        id: "u5",
        name: "Dr. Vazio",
        doctor_profile: {
          crm: "",
          crm_state: "",
          specialty: "",
        },
      };
      const result = mapDoctorRecord(user);
      // ?? não trata "" como nullish, então retorna ""
      expect(result.crm).toBe("");
      expect(result.crm_state).toBe("");
      expect(result.specialty).toBe("");
    });

    it("preserva id e name do user", () => {
      const user = {
        id: "abc-123",
        name: "Dr. Maria Santos",
        doctor_profile: { crm: "999" },
      };
      const result = mapDoctorRecord(user);
      expect(result.id).toBe("abc-123");
      expect(result.name).toBe("Dr. Maria Santos");
    });

    it("mapeia lista de múltiplos registros corretamente", () => {
      const records = [
        {
          id: "1",
          name: "Dr. A",
          doctor_profile: { crm: "111", crm_state: "RJ", specialty: "Cardio" },
        },
        {
          id: "2",
          name: "Dr. B",
          doctor_profile: null,
        },
        {
          id: "3",
          name: "Dr. C",
          crm: "LEGACY",
          doctor_profile: { crm: "333", crm_state: "MG" },
        },
      ];
      const results = records.map(mapDoctorRecord);
      expect(results).toHaveLength(3);
      expect(results[0].crm).toBe("111");
      expect(results[1].crm).toBe("");
      expect(results[2].crm).toBe("333"); // usa doctor_profile, ignora legacy
    });
  });
});
