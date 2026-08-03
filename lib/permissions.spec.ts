import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  HOME_ORDER,
  Permission,
  PROFILE_PRESETS,
  permissionForRoute,
  presetFor,
  resolveHome,
} from "./permissions";

describe("permissionForRoute", () => {
  it("associa a rota à sua área", () => {
    expect(permissionForRoute("/agenda")).toBe(Permission.AGENDA);
    expect(permissionForRoute("/atendimento/abc-123")).toBe(
      Permission.ATENDIMENTO,
    );
    expect(permissionForRoute("/solicitacoes-cirurgicas")).toBe(
      Permission.SOLICITACOES,
    );
    expect(permissionForRoute("/colaboradores")).toBe(Permission.ADMINISTRACAO);
  });

  it("deixa rota comum sem exigência", () => {
    expect(permissionForRoute("/configuracoes")).toBeNull();
    expect(permissionForRoute("/notificacoes")).toBeNull();
    expect(permissionForRoute("/pacientes/abc")).toBeNull();
  });

  /** /solicitacao/:id é o detalhe da SC e não compartilha prefixo com a lista. */
  it("cobre o detalhe da solicitação", () => {
    expect(permissionForRoute("/solicitacao/abc-123")).toBe(
      Permission.SOLICITACOES,
    );
  });
});

describe("resolveHome", () => {
  it("manda quem tem solicitações para o dashboard", () => {
    expect(resolveHome([Permission.SOLICITACOES])).toBe("/dashboard");
  });

  it("manda o colaborador de atendimento para o atendimento", () => {
    expect(resolveHome([Permission.ATENDIMENTO])).toBe("/atendimento");
  });

  it("manda o colaborador de agenda para a agenda", () => {
    expect(resolveHome([Permission.AGENDA])).toBe("/agenda");
  });

  it("cai em configurações quando não há área nenhuma", () => {
    expect(resolveHome([])).toBe("/configuracoes");
  });
});

describe("resolveHome nunca aponta para uma rota que o guarda bloqueia", () => {
  /**
   * Tarefa 17, ponto 1: se `resolveHome` devolvesse uma rota que
   * `permissionForRoute` exige e a combinação de permissões não cobre, o
   * `PermissionRouteGuard` entraria em loop de redirecionamento e travaria a
   * aplicação inteira. As 2^4 combinações de `ALL_PERMISSIONS` (incluindo a
   * lista vazia e o caso isolado de ADMINISTRACAO) cobrem todo colaborador
   * possível — não é uma amostra, é a varredura completa.
   */
  function allCombinations(): Permission[][] {
    const total = 1 << ALL_PERMISSIONS.length;
    const combinations: Permission[][] = [];
    for (let mask = 0; mask < total; mask++) {
      combinations.push(
        ALL_PERMISSIONS.filter((_, index) => (mask & (1 << index)) !== 0),
      );
    }
    return combinations;
  }

  const combinations = allCombinations();

  it("cobre as 16 combinações possíveis", () => {
    expect(combinations).toHaveLength(16);
  });

  it.each(combinations.map((permissions) => [permissions]))(
    "libera o destino de resolveHome para %j",
    (permissions) => {
      const home = resolveHome(permissions);
      const exigida = permissionForRoute(home);
      const liberado = !exigida || permissions.includes(exigida);
      expect(liberado).toBe(true);
    },
  );
});

describe("PROFILE_PRESETS", () => {
  it("tem um preset por combinação pedida", () => {
    expect(Object.keys(PROFILE_PRESETS)).toEqual([
      "atendimento",
      "cirurgia",
      "completo",
    ]);
  });

  it("o preset completo cobre as três áreas de trabalho", () => {
    expect(PROFILE_PRESETS.completo).toEqual([
      Permission.AGENDA,
      Permission.ATENDIMENTO,
      Permission.SOLICITACOES,
    ]);
  });

  it("nenhum preset concede administração", () => {
    Object.values(PROFILE_PRESETS).forEach((preset) => {
      expect(preset).not.toContain(Permission.ADMINISTRACAO);
    });
  });

  it("todo preset usa apenas permissões conhecidas", () => {
    Object.values(PROFILE_PRESETS).forEach((preset) => {
      preset.forEach((p) => expect(ALL_PERMISSIONS).toContain(p));
    });
  });
});

describe("HOME_ORDER", () => {
  it("prioriza atendimento sobre agenda", () => {
    expect(HOME_ORDER[0].permission).toBe(Permission.ATENDIMENTO);
  });
});

describe("presetFor", () => {
  /**
   * O seletor da Tarefa 18 chama `presetFor` a cada render para destacar o
   * perfil correspondente. Se a ordem do array recebido mudasse o resultado,
   * a mesma seleção lógica oscilaria entre "Personalizado" e o perfil certo
   * dependendo de como o backend/estado devolveu o array.
   */
  it("reconhece o preset independentemente da ordem do array", () => {
    expect(
      presetFor([Permission.SOLICITACOES, Permission.AGENDA]),
    ).toBe("cirurgia");
    expect(
      presetFor([Permission.AGENDA, Permission.SOLICITACOES]),
    ).toBe("cirurgia");
    expect(
      presetFor([
        Permission.SOLICITACOES,
        Permission.ATENDIMENTO,
        Permission.AGENDA,
      ]),
    ).toBe("completo");
    expect(
      presetFor([
        Permission.ATENDIMENTO,
        Permission.AGENDA,
        Permission.SOLICITACOES,
      ]),
    ).toBe("completo");
  });

  it("ignora administração ao comparar com os presets", () => {
    expect(
      presetFor([
        Permission.ADMINISTRACAO,
        Permission.AGENDA,
        Permission.ATENDIMENTO,
      ]),
    ).toBe("atendimento");
  });

  it("cai em personalizado quando a seleção não bate com nenhum preset", () => {
    expect(presetFor([Permission.AGENDA])).toBe("personalizado");
    expect(presetFor([])).toBe("personalizado");
  });
});
