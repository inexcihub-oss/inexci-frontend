import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  FETCH_ALL_TAKE: 1000,
}));

import api from "@/lib/api";
import { createCrudService, createGetById } from "./crud-service";
import { hospitalService } from "./hospital.service";
import { clinicService } from "./clinic.service";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe("createCrudService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAll aceita lista crua ou { records } e pede a lista inteira", async () => {
    const service = createCrudService<{ id: string }, { name: string }>(
      "/coisas",
    );
    mocked(api.get).mockResolvedValueOnce({ data: [{ id: "1" }] });
    expect(await service.getAll()).toEqual([{ id: "1" }]);
    mocked(api.get).mockResolvedValueOnce({ data: { records: [{ id: "2" }] } });
    expect(await service.getAll()).toEqual([{ id: "2" }]);
    expect(api.get).toHaveBeenCalledWith("/coisas", {
      params: { take: 1000 },
    });
  });

  it("aplica o map no getAll, no create e no update", async () => {
    const service = createCrudService<
      { id: string; label: string },
      { name: string },
      { id: string; name: string }
    >("/coisas", (raw) => ({ id: raw.id, label: raw.name.toUpperCase() }));
    mocked(api.post).mockResolvedValue({ data: { id: "1", name: "a" } });
    mocked(api.patch).mockResolvedValue({ data: { id: "1", name: "b" } });

    expect(await service.create({ name: "a" })).toEqual({
      id: "1",
      label: "A",
    });
    expect(await service.update("1", { name: "b" })).toEqual({
      id: "1",
      label: "B",
    });
    expect(api.post).toHaveBeenCalledWith("/coisas", { name: "a" });
    expect(api.patch).toHaveBeenCalledWith("/coisas/1", { name: "b" });
  });

  it("deleteMany usa o bulk-delete e não chama a API sem ids", async () => {
    const service = createCrudService("/coisas");
    await service.deleteMany([]);
    expect(api.post).not.toHaveBeenCalled();

    await service.deleteMany(["1", "2"]);
    expect(api.post).toHaveBeenCalledWith("/coisas/bulk-delete", {
      ids: ["1", "2"],
    });

    await service.delete("3");
    expect(api.delete).toHaveBeenCalledWith("/coisas/3");
  });

  it("createGetById busca por id e aplica o map", async () => {
    const getById = createGetById<{ id: string; ok: boolean }, { id: string }>(
      "/coisas",
      (raw) => ({ id: raw.id, ok: true }),
    );
    mocked(api.get).mockResolvedValue({ data: { id: "9" } });
    expect(await getById("9")).toEqual({ id: "9", ok: true });
    expect(api.get).toHaveBeenCalledWith("/coisas/9");
  });
});

describe("serviços de cadastro sobre a fábrica", () => {
  beforeEach(() => vi.clearAllMocks());

  it("convênio segue na rota snake_case do backend", async () => {
    const { healthPlanService } = await import("./health-plan.service");
    mocked(api.get).mockResolvedValue({ data: [] });
    await healthPlanService.getAll();
    expect(api.get).toHaveBeenCalledWith("/health_plans", {
      params: { take: 1000 },
    });
  });

  it("hospital não expõe getById (o backend não tem GET /hospitals/:id)", () => {
    expect("getById" in hospitalService).toBe(false);
  });

  it("clínica normaliza o horário de funcionamento vindo nulo", async () => {
    mocked(api.get).mockResolvedValue({
      data: { id: "c1", name: "Centro", businessHours: null },
    });
    const clinic = await clinicService.getById("c1");
    expect(clinic.businessHours).toBeDefined();
    expect(Array.isArray(clinic.businessHours.mon)).toBe(true);
  });
});
