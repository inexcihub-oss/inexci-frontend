import { describe, it, expect } from "vitest";
import { attemptsLabel, parseQueueName, QUEUE_NAMES } from "../admin-queues";

describe("lib/admin-queues", () => {
  it("aceita só filas conhecidas", () => {
    expect(parseQueueName("mail")).toBe("mail");
    expect(parseQueueName("outra")).toBeUndefined();
    expect(parseQueueName(null)).toBeUndefined();
    expect(QUEUE_NAMES).toHaveLength(7);
  });

  it("descreve as tentativas", () => {
    expect(attemptsLabel(3, 3)).toBe("3 de 3 tentativas");
    expect(attemptsLabel(1, null)).toBe("1 tentativa");
    expect(attemptsLabel(1, 1)).toBe("1 de 1 tentativa");
  });
});
