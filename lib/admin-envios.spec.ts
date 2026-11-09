import { describe, it, expect } from "vitest";
import { isUuid, totalsByChannel } from "./admin-envios";

describe("isUuid", () => {
  it("aceita UUID completo e recusa parcial ou lixo", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid(" 11111111-1111-4111-8111-111111111111 ")).toBe(true);
    expect(isUuid("11111111-1111-4111")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("abc")).toBe(false);
  });
});

describe("totalsByChannel", () => {
  it("soma por canal e situação", () => {
    const out = totalsByChannel([
      { channel: "email", status: "sent", count: 5 },
      { channel: "email", status: "failed", count: 2 },
      { channel: "whatsapp", status: "delivered", count: 3 },
    ]);
    expect(out.email.sent).toBe(5);
    expect(out.email.failed).toBe(2);
    expect(out.email.total).toBe(7);
    expect(out.whatsapp.delivered).toBe(3);
    expect(out.whatsapp.total).toBe(3);
  });

  it("sem linhas devolve zeros", () => {
    expect(totalsByChannel([]).email.total).toBe(0);
  });
});
