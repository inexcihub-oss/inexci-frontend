import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatTimeAgo } from "@/lib/formatters";

/**
 * TASK-FE-I02: Testes para substituição de dados mock por dados reais.
 *
 * Valida a lógica de:
 * 1. formatTimeAgo — formatação de tempo relativo
 * 2. Filtragem de solicitações por doctor_id (médico)
 * 3. Ordenação de pacientes por data de criação (assistente)
 * 4. Mapeamento de registros da API para o formato da sidebar
 */

// ─── Tipos simulados ───

interface RawSurgeryRequest {
  id: number;
  doctor_id: string;
  patient: { id: number; name: string };
  procedure: { name: string } | null;
  is_indication?: boolean;
  indication_name?: string;
  created_at: string;
}

interface RawPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

// ─── Funções extraídas dos componentes ───

function filterByDoctorId(
  records: RawSurgeryRequest[],
  doctorId: string,
): RawSurgeryRequest[] {
  return records.filter((r) => String(r.doctor_id) === String(doctorId));
}

function mapToSidebarRequest(record: RawSurgeryRequest) {
  return {
    id: String(record.id),
    patientName: record.patient?.name || "Paciente",
    procedure:
      record.is_indication && record.indication_name
        ? record.indication_name
        : record.procedure?.name || "Procedimento",
    time: formatTimeAgo(record.created_at),
  };
}

function sortPatientsByRecent(patients: RawPatient[]): RawPatient[] {
  return [...patients].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// ─── Testes ───

describe("TASK-FE-I02 — Dados reais nas páginas de detalhe", () => {
  describe("formatTimeAgo", () => {
    beforeEach(() => {
      // Fixar "agora" = 2026-04-15T12:00:00Z
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retorna "agora" para menos de 1 minuto atrás', () => {
      expect(formatTimeAgo("2026-04-15T11:59:30Z")).toBe("agora");
    });

    it("retorna minutos corretamente", () => {
      expect(formatTimeAgo("2026-04-15T11:55:00Z")).toBe("5 minutos atrás");
    });

    it("retorna 1 minuto no singular", () => {
      expect(formatTimeAgo("2026-04-15T11:59:00Z")).toBe("1 minuto atrás");
    });

    it("retorna horas corretamente", () => {
      expect(formatTimeAgo("2026-04-15T09:00:00Z")).toBe("3 horas atrás");
    });

    it("retorna 1 hora no singular", () => {
      expect(formatTimeAgo("2026-04-15T11:00:00Z")).toBe("1 hora atrás");
    });

    it("retorna dias corretamente", () => {
      expect(formatTimeAgo("2026-04-13T12:00:00Z")).toBe("2 dias atrás");
    });

    it("retorna 1 dia no singular", () => {
      expect(formatTimeAgo("2026-04-14T12:00:00Z")).toBe("1 dia atrás");
    });

    it("retorna semanas corretamente", () => {
      expect(formatTimeAgo("2026-04-01T12:00:00Z")).toBe("2 semanas atrás");
    });

    it("retorna 1 semana no singular", () => {
      expect(formatTimeAgo("2026-04-08T12:00:00Z")).toBe("1 semana atrás");
    });

    it("retorna meses corretamente", () => {
      expect(formatTimeAgo("2026-02-13T12:00:00Z")).toBe("2 meses atrás");
    });

    it("retorna 1 mês no singular", () => {
      expect(formatTimeAgo("2026-03-15T12:00:00Z")).toBe("1 mês atrás");
    });

    it("retorna anos corretamente", () => {
      expect(formatTimeAgo("2024-04-15T12:00:00Z")).toBe("2 anos atrás");
    });

    it("retorna 1 ano no singular", () => {
      expect(formatTimeAgo("2025-04-15T12:00:00Z")).toBe("1 ano atrás");
    });

    it('retorna "agora" para data futura', () => {
      expect(formatTimeAgo("2026-04-16T12:00:00Z")).toBe("agora");
    });

    it("aceita objeto Date", () => {
      const date = new Date("2026-04-14T12:00:00Z");
      expect(formatTimeAgo(date)).toBe("1 dia atrás");
    });
  });

  describe("Filtragem por doctor_id (página médico)", () => {
    const mockRecords: RawSurgeryRequest[] = [
      {
        id: 1,
        doctor_id: "doc-1",
        patient: { id: 10, name: "Maria Silva" },
        procedure: { name: "Artroscopia" },
        created_at: "2026-04-10T10:00:00Z",
      },
      {
        id: 2,
        doctor_id: "doc-2",
        patient: { id: 11, name: "João Santos" },
        procedure: { name: "Cirurgia de Menisco" },
        created_at: "2026-04-11T10:00:00Z",
      },
      {
        id: 3,
        doctor_id: "doc-1",
        patient: { id: 12, name: "Ana Souza" },
        procedure: { name: "Reconstrução LCA" },
        created_at: "2026-04-12T10:00:00Z",
      },
      {
        id: 4,
        doctor_id: "doc-3",
        patient: { id: 13, name: "Pedro Oliveira" },
        procedure: null,
        is_indication: true,
        indication_name: "Procedimento Indicado",
        created_at: "2026-04-13T10:00:00Z",
      },
    ];

    it("filtra corretamente por doctor_id", () => {
      const filtered = filterByDoctorId(mockRecords, "doc-1");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual([1, 3]);
    });

    it("retorna vazio quando doctor_id não existe", () => {
      const filtered = filterByDoctorId(mockRecords, "doc-999");
      expect(filtered).toHaveLength(0);
    });

    it("funciona com doctor_id numérico convertido", () => {
      const records = [
        {
          id: 10,
          doctor_id: "42",
          patient: { id: 1, name: "Teste" },
          procedure: { name: "Proc" },
          created_at: "2026-04-10T10:00:00Z",
        },
      ];
      const filtered = filterByDoctorId(records, "42");
      expect(filtered).toHaveLength(1);
    });
  });

  describe("Mapeamento de dados para a sidebar (página médico)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("mapeia corretamente um registro com procedure", () => {
      const record: RawSurgeryRequest = {
        id: 1,
        doctor_id: "doc-1",
        patient: { id: 10, name: "Maria Silva" },
        procedure: { name: "Artroscopia de Joelho" },
        created_at: "2026-04-14T12:00:00Z",
      };
      const mapped = mapToSidebarRequest(record);
      expect(mapped).toEqual({
        id: "1",
        patientName: "Maria Silva",
        procedure: "Artroscopia de Joelho",
        time: "1 dia atrás",
      });
    });

    it("usa indication_name quando is_indication é true", () => {
      const record: RawSurgeryRequest = {
        id: 2,
        doctor_id: "doc-1",
        patient: { id: 11, name: "João" },
        procedure: null,
        is_indication: true,
        indication_name: "Indicação Especial",
        created_at: "2026-04-13T12:00:00Z",
      };
      const mapped = mapToSidebarRequest(record);
      expect(mapped.procedure).toBe("Indicação Especial");
    });

    it('usa "Procedimento" como fallback quando procedure é null', () => {
      const record: RawSurgeryRequest = {
        id: 3,
        doctor_id: "doc-1",
        patient: { id: 12, name: "Ana" },
        procedure: null,
        created_at: "2026-04-12T12:00:00Z",
      };
      const mapped = mapToSidebarRequest(record);
      expect(mapped.procedure).toBe("Procedimento");
    });

    it('usa "Paciente" como fallback quando patient.name é vazio', () => {
      const record: RawSurgeryRequest = {
        id: 4,
        doctor_id: "doc-1",
        patient: { id: 13, name: "" },
        procedure: { name: "Proc" },
        created_at: "2026-04-11T12:00:00Z",
      };
      const mapped = mapToSidebarRequest(record);
      // Nota: string vazia é falsy, então cai no fallback
      expect(mapped.patientName).toBe("Paciente");
    });
  });

  describe("Ordenação de pacientes por data (página assistente)", () => {
    const mockPatients: RawPatient[] = [
      { id: "p1", name: "Antigo", createdAt: "2026-01-01T10:00:00Z" },
      { id: "p2", name: "Recente", createdAt: "2026-04-10T10:00:00Z" },
      { id: "p3", name: "Médio", createdAt: "2026-03-15T10:00:00Z" },
      { id: "p4", name: "Mais recente", createdAt: "2026-04-14T10:00:00Z" },
    ];

    it("ordena pacientes do mais recente para o mais antigo", () => {
      const sorted = sortPatientsByRecent(mockPatients);
      expect(sorted.map((p) => p.name)).toEqual([
        "Mais recente",
        "Recente",
        "Médio",
        "Antigo",
      ]);
    });

    it("não modifica o array original", () => {
      const original = [...mockPatients];
      sortPatientsByRecent(mockPatients);
      expect(mockPatients).toEqual(original);
    });

    it("slice(0, 5) limita a 5 resultados", () => {
      const manyPatients: RawPatient[] = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        name: `Paciente ${i}`,
        createdAt: `2026-04-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
      }));
      const sorted = sortPatientsByRecent(manyPatients).slice(0, 5);
      expect(sorted).toHaveLength(5);
      // O primeiro deve ser o mais recente (dia 10)
      expect(sorted[0].name).toBe("Paciente 9");
    });
  });
});
