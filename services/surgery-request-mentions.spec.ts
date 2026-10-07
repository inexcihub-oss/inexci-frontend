import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from "@/lib/api";
import { surgeryRequestService } from "./surgery-request.service";

describe("surgeryRequestService — menções", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("busca os usuários mencionáveis da solicitação", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: "user-2", name: "Dr. Bruno", avatarUrl: null }],
    });

    const result = await surgeryRequestService.getMentionableUsers("sc-1");

    // A rota vive sob o controller de atividades
    // (`@Controller('surgery-requests/:id/activities')` +
    // `@Get('mentionable-users')`). Omitir o segmento `/activities` devolve
    // 404, e o `.catch` do ActivityComposer transforma isso em "lista vazia" —
    // o dropdown de @ simplesmente não abre, sem erro na tela.
    expect(api.get).toHaveBeenCalledWith(
      "/surgery-requests/sc-1/activities/mentionable-users",
    );
    expect(result).toEqual([
      { id: "user-2", name: "Dr. Bruno", avatarUrl: null },
    ]);
  });

  it("envia os ids mencionados junto do comentário", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: "act-1" } });

    await surgeryRequestService.createActivity("sc-1", "@Dr. Bruno confere?", [
      "user-2",
    ]);

    expect(api.post).toHaveBeenCalledWith("/surgery-requests/sc-1/activities", {
      content: "@Dr. Bruno confere?",
      type: "comment",
      mentionedUserIds: ["user-2"],
    });
  });

  it("omite o campo quando não há menção", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: "act-1" } });

    await surgeryRequestService.createActivity("sc-1", "sem menção");

    expect(api.post).toHaveBeenCalledWith("/surgery-requests/sc-1/activities", {
      content: "sem menção",
      type: "comment",
    });
  });
});
