import { describe, expect, it } from "vitest";
import {
  displayAgendaStatus,
  filterAgendaByDoctors,
  filterAgendaItems,
  formatAgendaDateBR,
  formatAgendaTime,
  formatPeriodLabel,
  getAgendaStatusLabel,
  groupAgendaByDate,
  normalizeAgendaItems,
  toLocalDateKey,
} from "./export-agenda";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

function makeItem(
  overrides: Partial<SurgeryRequestListItem> = {},
): SurgeryRequestListItem {
  return {
    id: 1,
    status: 5,
    protocol: "123456",
    priority: 2,
    createdAt: "2026-07-01T12:00:00.000Z",
    surgeryDate: "2026-07-15T23:35:00.000Z",
    patient: { id: "p1", name: "Fernando Augusto Costa" },
    doctor: { id: "d1", name: "Carlos Mendonça" },
    healthPlan: { id: "h1", name: "Unimed" },
    hospital: { id: "ho1", name: "Hospital São Lucas" },
    procedure: { id: "pr1", name: "Artroplastia total do joelho" },
    tussProcedure: null,
    ...overrides,
  };
}

describe("export-agenda", () => {
  it("normaliza apenas registros com surgeryDate", () => {
    const items = normalizeAgendaItems([
      makeItem(),
      makeItem({ id: 2, surgeryDate: null }),
      makeItem({
        id: 3,
        surgeryDate: "2026-07-10T10:00:00.000Z",
      }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(3);
    expect(items[1].id).toBe(1);
  });

  it("filtra por período e status", () => {
    const items = normalizeAgendaItems([
      makeItem({ id: 1, status: 5, surgeryDate: "2026-07-15T10:00:00.000Z" }),
      makeItem({ id: 2, status: 6, surgeryDate: "2026-07-20T10:00:00.000Z" }),
      makeItem({ id: 3, status: 7, surgeryDate: "2026-08-01T10:00:00.000Z" }),
    ]);

    const byPeriod = filterAgendaItems(items, {
      from: "2026-07-01",
      to: "2026-07-31",
    });
    expect(byPeriod.map((item) => item.id)).toEqual([1, 2]);

    const onlyScheduled = filterAgendaItems(items, {
      from: "2026-07-01",
      to: "2026-08-31",
      statusFilter: 5,
    });
    expect(onlyScheduled).toHaveLength(1);
    expect(onlyScheduled[0].id).toBe(1);

    const onlyPerformed = filterAgendaItems(items, {
      from: "2026-07-01",
      to: "2026-08-31",
      statusFilter: 6,
    });
    expect(onlyPerformed.map((item) => item.id)).toEqual([2, 3]);
  });

  it("filtra por médicos selecionados", () => {
    const items = normalizeAgendaItems([
      makeItem({ id: 1, doctor: { id: "d1", name: "Carlos Mendonça" } }),
      makeItem({
        id: 2,
        doctor: { id: "d2", name: "Ana Paula" },
        surgeryDate: "2026-07-16T10:00:00.000Z",
      }),
    ]);

    expect(filterAgendaByDoctors(items, [])).toHaveLength(2);
    expect(filterAgendaByDoctors(items, ["d1"])).toHaveLength(1);
    expect(filterAgendaByDoctors(items, ["d1"])[0].id).toBe(1);

    const filtered = filterAgendaItems(items, {
      from: "2026-07-01",
      to: "2026-07-31",
      doctorIds: ["d2"],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(2);
  });

  it("agrupa cirurgias por data local", () => {
    const items = normalizeAgendaItems([
      makeItem({ id: 1, surgeryDate: "2026-07-15T10:00:00.000Z" }),
      makeItem({ id: 2, surgeryDate: "2026-07-15T18:00:00.000Z" }),
      makeItem({ id: 3, surgeryDate: "2026-07-16T08:00:00.000Z" }),
    ]);

    const grouped = groupAgendaByDate(items);
    expect(grouped).toHaveLength(2);
    expect(grouped[0][0]).toBe("2026-07-15");
    expect(grouped[0][1]).toHaveLength(2);
    expect(grouped[1][0]).toBe("2026-07-16");
  });

  it("formata status, data, hora e período", () => {
    expect(displayAgendaStatus(7)).toBe(6);
    expect(getAgendaStatusLabel(5)).toBe("Agendada");
    expect(getAgendaStatusLabel(8)).toBe("Realizada");
    expect(toLocalDateKey("2026-07-15T23:35:00.000Z")).toMatch(/2026-07-1[45]/);
    expect(formatAgendaDateBR("2026-07-15T10:00:00.000Z")).toBe("15/07/2026");
    expect(formatAgendaTime("2026-07-15T23:35:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
    expect(formatPeriodLabel("2026-07-01", "2026-07-31")).toBe(
      "01/07/2026 a 31/07/2026",
    );
    expect(formatPeriodLabel("2026-07-15", "2026-07-15")).toBe("15/07/2026");
  });
});
