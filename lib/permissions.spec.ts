import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  HOME_ORDER,
  Permission,
  PROFILE_PRESETS,
  hasAnyArea,
  permissionForRoute,
  presetFor,
  resolveHome,
  routeRequiresAnyArea,
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

  /**
   * Cadastros transversais: as telas de detalhe moram sob /colaboradores por
   * herança de layout, mas o dado é compartilhado pelas quatro áreas. O
   * prefixo mais específico precisa vencer o "/colaboradores" — senão o guard
   * devolve o colaborador para a casa dele assim que ele clica numa linha da
   * lista de hospitais.
   */
  it.each([
    "/colaboradores/hospital/abc-123",
    "/colaboradores/convenio/abc-123",
    "/colaboradores/fornecedor/abc-123",
    "/colaboradores/fabricante/abc-123",
  ])("libera o cadastro transversal %s", (rota) => {
    expect(permissionForRoute(rota)).toBeNull();
    expect(routeRequiresAnyArea(rota)).toBe(true);
  });

  it("mantém o resto de /colaboradores em Administração", () => {
    expect(permissionForRoute("/colaboradores/assistente/abc-123")).toBe(
      Permission.ADMINISTRACAO,
    );
  });

  it("exige administração para o cadastro de clínicas", () => {
    expect(permissionForRoute("/clinicas")).toBe(Permission.ADMINISTRACAO);
    expect(permissionForRoute("/clinicas/abc-123")).toBe(
      Permission.ADMINISTRACAO,
    );
  });

  it("não trata rotas comuns como cadastro transversal", () => {
    expect(routeRequiresAnyArea("/configuracoes")).toBe(false);
  });
});

describe("hasAnyArea", () => {
  it("aceita qualquer uma das quatro áreas", () => {
    ALL_PERMISSIONS.forEach((p) => expect(hasAnyArea([p])).toBe(true));
  });

  /**
   * Espelha o `@RequireAnyArea()`: o colaborador criado sem área nenhuma não
   * pode cadastrar hospital/convênio/fornecedor/fabricante. Sem esta checagem
   * o botão apareceria e o backend responderia 403 no envio.
   */
  it("recusa quem não tem área nenhuma", () => {
    expect(hasAnyArea([])).toBe(false);
  });
});

describe("resolveHome", () => {
  it("manda quem só tem solicitações para o dashboard", () => {
    expect(resolveHome([Permission.SOLICITACOES])).toBe("/dashboard");
  });

  /**
   * O médico tem as três áreas de trabalho. Enquanto `resolveHome`
   * curto-circuitava em `solicitacoes`, ele caía no /dashboard ao entrar — a
   * casa dele é o Atendimento.
   */
  it("prioriza atendimento sobre solicitações", () => {
    expect(
      resolveHome([Permission.ATENDIMENTO, Permission.SOLICITACOES]),
    ).toBe("/atendimento");
    expect(resolveHome(ALL_PERMISSIONS)).toBe("/atendimento");
  });

  it("prioriza agenda sobre solicitações quando não há atendimento", () => {
    expect(resolveHome([Permission.AGENDA, Permission.SOLICITACOES])).toBe(
      "/agenda",
    );
  });

  it("manda o colaborador de atendimento para o atendimento", () => {
    expect(resolveHome([Permission.ATENDIMENTO])).toBe("/atendimento");
  });

  it("manda o colaborador de agenda para a agenda", () => {
    expect(resolveHome([Permission.AGENDA])).toBe("/agenda");
  });

  it("manda o admin delegado para colaboradores", () => {
    // Antes ADMINISTRACAO não tinha entrada em HOME_ORDER e caía no fallback
    // `/configuracoes` — a única área do usuário ficava de fora da casa dele.
    expect(resolveHome([Permission.ADMINISTRACAO])).toBe("/colaboradores");
  });

  it("prioriza a área de trabalho sobre Administração", () => {
    expect(resolveHome([Permission.AGENDA, Permission.ADMINISTRACAO])).toBe(
      "/agenda",
    );
    expect(
      resolveHome([Permission.ATENDIMENTO, Permission.ADMINISTRACAO]),
    ).toBe("/atendimento");
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
