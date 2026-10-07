import { describe, it, expect } from "vitest";
import { resolveSidebarTabFromQuery } from "./sidebar-tab";

describe("resolveSidebarTabFromQuery", () => {
  it("reconhece a aba de atividades, que é o destino do link da menção", () => {
    expect(resolveSidebarTabFromQuery("atividades")).toBe("atividades");
  });

  it("reconhece as demais abas do painel", () => {
    expect(resolveSidebarTabFromQuery("pendencias")).toBe("pendencias");
    expect(resolveSidebarTabFromQuery("timeline")).toBe("timeline");
  });

  it("ignora valor desconhecido ou ausente", () => {
    expect(resolveSidebarTabFromQuery("qualquer")).toBeNull();
    expect(resolveSidebarTabFromQuery(null)).toBeNull();
  });
});
