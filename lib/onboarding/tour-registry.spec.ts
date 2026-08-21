import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  Permission,
  permissionForRoute,
} from "@/lib/permissions";
import { TRACKS, canSee, visibleSteps, visibleTracks } from "./tour-registry";

/** As 16 combinações de área, no molde de `lib/permissions.spec.ts`. */
function todasAsCombinacoes(): Permission[][] {
  const combos: Permission[][] = [];
  for (let mascara = 0; mascara < 1 << ALL_PERMISSIONS.length; mascara++) {
    combos.push(ALL_PERMISSIONS.filter((_, i) => mascara & (1 << i)));
  }
  return combos;
}

describe("canSee", () => {
  const base = { permissions: [], isDoctor: false, isAccountOwner: false };

  it("libera gate vazio", () => {
    expect(canSee({}, base)).toBe(true);
  });

  it("exige a área declarada", () => {
    expect(canSee({ permission: Permission.SOLICITACOES }, base)).toBe(false);
    expect(
      canSee(
        { permission: Permission.SOLICITACOES },
        { ...base, permissions: [Permission.SOLICITACOES] },
      ),
    ).toBe(true);
  });

  it("requiresDoctor olha doctor_profile, não a área de atendimento", () => {
    expect(
      canSee(
        { requiresDoctor: true },
        { ...base, permissions: [Permission.ATENDIMENTO] },
      ),
    ).toBe(false);
    expect(canSee({ requiresDoctor: true }, { ...base, isDoctor: true })).toBe(
      true,
    );
  });

  /**
   * O admin delegado tem role 'admin' mas não é dono: um gate baseado em
   * `isAdmin` o mandaria para a aba de plano, que o devolve.
   */
  it("requiresOwner olha isAccountOwner", () => {
    expect(
      canSee({ requiresOwner: true }, { ...base, permissions: ALL_PERMISSIONS }),
    ).toBe(false);
    expect(
      canSee({ requiresOwner: true }, { ...base, isAccountOwner: true }),
    ).toBe(true);
  });

  it("anyArea recusa quem não tem área nenhuma", () => {
    expect(canSee({ anyArea: true }, base)).toBe(false);
    expect(
      canSee({ anyArea: true }, { ...base, permissions: [Permission.AGENDA] }),
    ).toBe(true);
  });
});

describe("visibleTracks", () => {
  it("esconde a trilha da assinatura de quem não é médico", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.ATENDIMENTO, Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).not.toContain("documentos-do-medico");
  });

  it("mostra a trilha da assinatura para o médico", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.SOLICITACOES],
      isDoctor: true,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).toContain("documentos-do-medico");
  });

  it("esconde a trilha de solicitações de quem não tem a área", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.AGENDA],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).not.toContain("solicitacoes");
  });

  it("mostra a trilha de solicitações para quem tem a área", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).toContain("solicitacoes");
  });

  /**
   * A regra que evita o loop de redirect já visto neste projeto: nenhuma
   * trilha visível pode navegar para uma rota que o PermissionRouteGuard
   * bloqueia para aquele mesmo usuário.
   */
  it("nunca expõe passo que navega para rota proibida", () => {
    for (const permissions of todasAsCombinacoes()) {
      for (const isDoctor of [false, true]) {
        for (const isAccountOwner of [false, true]) {
          const viewer = { permissions, isDoctor, isAccountOwner };
          for (const track of visibleTracks(viewer)) {
            for (const step of visibleSteps(track, viewer)) {
              if (!step.route) continue;
              const exigida = permissionForRoute(step.route);
              if (!exigida) continue;
              expect(
                permissions.includes(exigida),
                `trilha ${track.id}, passo ${step.key}, rota ${step.route}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe("TRACKS", () => {
  it("não passa de sete passos por trilha", () => {
    for (const track of TRACKS) {
      expect(track.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("não tem id de trilha nem chave de passo duplicados", () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    for (const track of TRACKS) {
      const chaves = track.steps.map((s) => s.key);
      expect(new Set(chaves).size).toBe(chaves.length);
    }
  });
});
