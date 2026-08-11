import { describe, expect, it } from "vitest";

import {
  quotaDismissKey,
  resolveQuotaBanner,
  type QuotaThreshold,
} from "@/lib/quota-banner";
import type { QuotaStatus } from "@/types";

function quota(overrides: Partial<QuotaStatus> = {}): QuotaStatus {
  return {
    used: 0,
    limit: 20,
    isUnlimited: false,
    remaining: 20,
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Atalho: monta a cota a partir do consumo, com `remaining` coerente. */
function comConsumo(used: number, limit = 20): QuotaStatus {
  return quota({ used, limit, remaining: Math.max(0, limit - used) });
}

describe("resolveQuotaBanner — degraus", () => {
  const casos: Array<[string, QuotaStatus, QuotaThreshold | null]> = [
    ["sem consumo", comConsumo(0), null],
    ["abaixo de 75% (14/20 = 70%)", comConsumo(14), null],
    ["exatamente 75% (15/20)", comConsumo(15), "medium"],
    ["entre 75% e 90% (17/20 = 85%)", comConsumo(17), "medium"],
    ["exatamente 90% (18/20)", comConsumo(18), "high"],
    ["entre 90% e 100% (19/20 = 95%)", comConsumo(19), "high"],
    ["exatamente 100% (20/20)", comConsumo(20), "critical"],
    ["acima de 100% (21/20)", comConsumo(21), "critical"],
  ];

  it.each(casos)("%s → %s", (_nome, entrada, esperado) => {
    const variante = resolveQuotaBanner({
      quota: entrada,
      isAccountOwner: true,
    });
    expect(variante?.threshold ?? null).toBe(esperado);
  });

  it("não avisa nada quando o plano é ilimitado", () => {
    expect(
      resolveQuotaBanner({
        quota: quota({ isUnlimited: true, remaining: null, used: 999 }),
        isAccountOwner: true,
      }),
    ).toBeNull();
  });

  it("não avisa nada sem cota carregada", () => {
    expect(
      resolveQuotaBanner({ quota: null, isAccountOwner: true }),
    ).toBeNull();
    expect(
      resolveQuotaBanner({ quota: undefined, isAccountOwner: true }),
    ).toBeNull();
  });

  it("trata limite zero como teto atingido, sem dividir por zero", () => {
    const variante = resolveQuotaBanner({
      quota: quota({ limit: 0, used: 0, remaining: 0 }),
      isAccountOwner: true,
    });
    expect(variante?.threshold).toBe("critical");
    expect(variante?.progressPercent).toBe(100);
  });

  it("nasce num número inteiro: plano de 10 avisa na 8ª, não na 7ª", () => {
    expect(
      resolveQuotaBanner({ quota: comConsumo(7, 10), isAccountOwner: true }),
    ).toBeNull();
    expect(
      resolveQuotaBanner({ quota: comConsumo(8, 10), isAccountOwner: true })
        ?.threshold,
    ).toBe("medium");
  });
});

describe("resolveQuotaBanner — cópia", () => {
  it("usa número absoluto no título, não percentual", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(17),
      isAccountOwner: true,
    });
    expect(variante?.title).toBe("Faltam 3 de 20 solicitações neste ciclo");
    expect(variante?.title).not.toContain("%");
  });

  it("concorda o verbo no singular quando falta uma só", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(19),
      isAccountOwner: true,
    });
    expect(variante?.title).toBe("Falta 1 de 20 solicitações neste ciclo");
  });

  it("anuncia o limite atingido no degrau crítico", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(20),
      isAccountOwner: true,
    });
    expect(variante?.title).toBe(
      "Você atingiu o limite de 20 solicitações do plano",
    );
  });

  it("informa a data de renovação sem deslocar o fuso", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(17),
      isAccountOwner: true,
    });
    expect(variante?.description).toContain("01/09/2026");
  });

  it("expõe o consumo como rótulo e como percentual da barra", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(17),
      isAccountOwner: true,
    });
    expect(variante?.usageLabel).toBe("17/20");
    expect(variante?.progressPercent).toBe(85);
  });

  it("clampa a barra em 100% quando o uso passa do limite", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(25),
      isAccountOwner: true,
    });
    expect(variante?.progressPercent).toBe(100);
  });

  it("calcula o restante localmente se o backend não mandar", () => {
    const variante = resolveQuotaBanner({
      quota: quota({ used: 17, limit: 20, remaining: null }),
      isAccountOwner: true,
    });
    expect(variante?.title).toContain("Faltam 3");
  });
});

describe("resolveQuotaBanner — quem vê o CTA", () => {
  it("oferece upgrade ao dono da conta", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(17),
      isAccountOwner: true,
    });
    expect(variante?.showUpgradeCta).toBe(true);
    expect(variante?.description).not.toContain("administrador");
  });

  it("manda quem não é dono falar com o administrador, sem CTA", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(17),
      isAccountOwner: false,
    });
    expect(variante?.showUpgradeCta).toBe(false);
    expect(variante?.description).toContain(
      "Fale com o administrador da conta",
    );
  });

  it("mantém a orientação ao administrador também no degrau crítico", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(20),
      isAccountOwner: false,
    });
    expect(variante?.showUpgradeCta).toBe(false);
    expect(variante?.description).toContain(
      "Fale com o administrador da conta",
    );
  });
});

describe("resolveQuotaBanner — dispensa", () => {
  it("some quando o degrau já foi dispensado", () => {
    expect(
      resolveQuotaBanner({
        quota: comConsumo(17),
        isAccountOwner: true,
        dismissedThresholds: ["medium"],
      }),
    ).toBeNull();
  });

  it("volta no degrau seguinte mesmo tendo dispensado o anterior", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(18),
      isAccountOwner: true,
      dismissedThresholds: ["medium"],
    });
    expect(variante?.threshold).toBe("high");
  });

  it("não deixa dispensar o degrau crítico", () => {
    const variante = resolveQuotaBanner({
      quota: comConsumo(20),
      isAccountOwner: true,
      dismissedThresholds: ["medium", "high", "critical"],
    });
    expect(variante?.threshold).toBe("critical");
    expect(variante?.dismissible).toBe(false);
  });

  it("marca 75% e 90% como dispensáveis", () => {
    expect(
      resolveQuotaBanner({ quota: comConsumo(17), isAccountOwner: true })
        ?.dismissible,
    ).toBe(true);
    expect(
      resolveQuotaBanner({ quota: comConsumo(18), isAccountOwner: true })
        ?.dismissible,
    ).toBe(true);
  });
});

describe("quotaDismissKey", () => {
  it("carimba conta, ciclo e degrau", () => {
    expect(quotaDismissKey("acc-1", "2026-09-01", "medium")).toBe(
      "inexci:quota-dismissed:acc-1:2026-09-01:medium",
    );
  });

  it("muda quando o ciclo vira, fazendo o aviso reaparecer", () => {
    expect(quotaDismissKey("acc-1", "2026-09-01", "medium")).not.toBe(
      quotaDismissKey("acc-1", "2026-10-01", "medium"),
    );
  });
});
