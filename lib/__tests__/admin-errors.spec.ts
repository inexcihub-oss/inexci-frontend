import { describe, it, expect } from "vitest";
import {
  bucketErrorDays,
  parseErrorDays,
  parseErrorSource,
} from "../admin-errors";

describe("lib/admin-errors", () => {
  it("até 31 dias, uma barra por dia, com zero nos dias sem erro", () => {
    const buckets = bucketErrorDays(
      [
        { day: "2026-10-26", source: "http", total: 2 },
        { day: "2026-10-26", source: "queue", total: 1 },
        { day: "2026-10-28", source: "ai", total: 4 },
      ],
      "2026-10-26",
      "2026-10-28",
    );
    expect(buckets).toEqual([
      { key: "2026-10-26", label: "26/10", total: 3 },
      { key: "2026-10-27", label: "27/10", total: 0 },
      { key: "2026-10-28", label: "28/10", total: 4 },
    ]);
  });

  it("acima de 31 dias, agrupa por semana", () => {
    const buckets = bucketErrorDays(
      [{ day: "2026-08-02", source: "http", total: 5 }],
      "2026-07-31",
      "2026-10-28",
    );
    expect(buckets).toHaveLength(13);
    expect(buckets[0]).toEqual({ key: "2026-07-31", label: "31/07", total: 5 });
  });

  it("valida os parâmetros da URL", () => {
    expect(parseErrorDays("7")).toBe(7);
    expect(parseErrorDays("5")).toBe(30);
    expect(parseErrorDays(null)).toBe(30);
    expect(parseErrorSource("queue")).toBe("queue");
    expect(parseErrorSource("xpto")).toBeUndefined();
  });
});
