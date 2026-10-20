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

  it("cobre o detalhe da solicitação", () => {
    expect(permissionForRoute("/solicitacao/abc-123")).toBe(
      Permission.SOLICITACOES,
    );
  });

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

  it("recusa quem não tem área nenhuma", () => {
    expect(hasAnyArea([])).toBe(false);
  });
});

describe("resolveHome", () => {
  it("manda quem só tem solicitações para o dashboard", () => {
    expect(resolveHome([Permission.SOLICITACOES])).toBe("/dashboard");
  });

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

describe("NAV_ITEMS — fonte única do menu", () => {
  it("a permissão de cada item é a mesma que o guard aplica à rota", async () => {
    const { NAV_ITEMS, navItemPermission, permissionForRoute } = await import(
      "./permissions"
    );
    for (const item of NAV_ITEMS) {
      expect(navItemPermission(item)).toBe(permissionForRoute(item.href));
    }
  });

  it("barra inferior: 4 fixos na ordem do mobile e o resto no 'Mais'", async () => {
    const { mobileNavItems, NAV_ITEMS } = await import("./permissions");
    expect(mobileNavItems("primary").map((i) => i.href)).toEqual([
      "/atendimento",
      "/agenda",
      "/solicitacoes-cirurgicas",
      "/pacientes",
    ]);
    expect(
      mobileNavItems("primary").length + mobileNavItems("overflow").length,
    ).toBe(NAV_ITEMS.length);
  });

  it("o grupo Cadastros reúne as cinco telas de cadastro", async () => {
    const { CADASTROS_HREFS } = await import("./permissions");
    expect(CADASTROS_HREFS).toEqual([
      "/clinicas",
      "/hospitais",
      "/convenios",
      "/fornecedores",
      "/fabricantes",
    ]);
  });
});
