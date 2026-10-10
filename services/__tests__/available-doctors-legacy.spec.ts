import { describe, it, expect } from "vitest";

type UsuarioMedico = {
  id: string;
  name: string;
  doctorProfile?: {
    crm?: string;
    crmState?: string;
    specialty?: string;
  } | null;
};

function mapDoctorRecord(user: UsuarioMedico) {
  return {
    id: user.id,
    name: user.name,
    crm: user.doctorProfile?.crm ?? "",
    crmState: user.doctorProfile?.crmState ?? "",
    specialty: user.doctorProfile?.specialty ?? undefined,
  };
}

describe("TASK-FE-I03 — Remoção de fallbacks legacy", () => {
  describe("mapDoctorRecord — mapeamento limpo", () => {
    it("extrai dados corretamente de doctor_profile", () => {
      const user = {
        id: "u1",
        name: "Dr. Silva",
        doctorProfile: {
          crm: "123456",
          crmState: "SP",
          specialty: "Ortopedia",
        },
      };
      const result = mapDoctorRecord(user);
      expect(result).toEqual({
        id: "u1",
        name: "Dr. Silva",
        crm: "123456",
        crmState: "SP",
        specialty: "Ortopedia",
      });
    });

    it("retorna string vazia para crm/crm_state quando doctor_profile é null", () => {
      const user = {
        id: "u2",
        name: "Dr. Nulo",
        doctorProfile: null,
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crmState).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("retorna string vazia para crm/crm_state quando doctor_profile é undefined", () => {
      const user = {
        id: "u3",
        name: "Dr. Indefinido",
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crmState).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("NÃO faz fallback para campos legacy no user", () => {
      const user = {
        id: "u4",
        name: "Dr. Legacy",
        crm: "LEGACY-CRM",
        crmState: "LEGACY-STATE",
        specialty: "LEGACY-SPEC",
        doctorProfile: null,
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crmState).toBe("");
      expect(result.specialty).toBeUndefined();
    });

    it("doctor_profile com campos vazios retorna string vazia (não undefined)", () => {
      const user = {
        id: "u5",
        name: "Dr. Vazio",
        doctorProfile: {
          crm: "",
          crmState: "",
          specialty: "",
        },
      };
      const result = mapDoctorRecord(user);
      expect(result.crm).toBe("");
      expect(result.crmState).toBe("");
      expect(result.specialty).toBe("");
    });

    it("preserva id e name do user", () => {
      const user = {
        id: "abc-123",
        name: "Dr. Maria Santos",
        doctorProfile: { crm: "999" },
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
          doctorProfile: { crm: "111", crmState: "RJ", specialty: "Cardio" },
        },
        {
          id: "2",
          name: "Dr. B",
          doctorProfile: null,
        },
        {
          id: "3",
          name: "Dr. C",
          crm: "LEGACY",
          doctorProfile: { crm: "333", crmState: "MG" },
        },
      ];
      const results = records.map(mapDoctorRecord);
      expect(results).toHaveLength(3);
      expect(results[0].crm).toBe("111");
      expect(results[1].crm).toBe("");
      expect(results[2].crm).toBe("333");
    });
  });
});
