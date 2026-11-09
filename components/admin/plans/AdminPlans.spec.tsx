import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({ listPlans: vi.fn() }));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminPlans } from "./AdminPlans";

const plan = (over: Record<string, unknown>) => ({
  id: "p",
  slug: "starter",
  name: "Starter",
  billingPeriod: "MONTHLY",
  priceCents: 9900,
  currency: "brl",
  surgeryRequestQuota: 10,
  isActive: true,
  isTrialDefault: false,
  gatewayPriceId: "price_1",
  accounts: 3,
  gatewayPriceCents: 9900,
  gatewayCycle: "MONTHLY",
  gatewayCurrency: "brl",
  gatewayPriceActive: true,
  divergent: false,
  gatewayError: false,
  ...over,
});

function mockMobile() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("AdminPlans", () => {
  it("lista os planos e marca divergência e falha da Stripe", async () => {
    svc.listPlans.mockResolvedValue([
      plan({ id: "1", name: "Starter" }),
      plan({
        id: "2",
        name: "Pro",
        billingPeriod: "YEARLY",
        priceCents: 100000,
        gatewayPriceCents: 90000,
        divergent: true,
        surgeryRequestQuota: -1,
        isTrialDefault: true,
      }),
      plan({ id: "3", name: "Plus", gatewayError: true, divergent: null }),
    ]);
    renderWithProviders(<AdminPlans />);

    expect(await screen.findByText("Starter")).toBeInTheDocument();
    expect(screen.getAllByText("Divergente da Stripe")).toHaveLength(1);
    expect(screen.getByText(/Stripe: R\$\s*900,00/)).toBeInTheDocument();
    expect(
      screen.getAllByText("Não foi possível consultar a Stripe"),
    ).toHaveLength(1);
    expect(screen.getByText("Ilimitada")).toBeInTheDocument();
    expect(screen.getByText("Anual")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.000,00/)).toBeInTheDocument();
  });

  it("mostra erro de carregamento", async () => {
    svc.listPlans.mockRejectedValue(new Error("x"));
    renderWithProviders(<AdminPlans />);
    expect(
      await screen.findByText("Não foi possível carregar os planos"),
    ).toBeInTheDocument();
  });

  describe("no celular", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("cada plano vira um card com período, preço e cota", async () => {
      mockMobile();
      svc.listPlans.mockResolvedValue([
        plan({ id: "1", name: "Starter" }),
        plan({
          id: "2",
          name: "Pro",
          billingPeriod: "YEARLY",
          surgeryRequestQuota: -1,
        }),
      ]);
      renderWithProviders(<AdminPlans />);
      const pro = (await screen.findByText("Pro")).closest("li")!;
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(within(pro).getByText("Anual")).toBeInTheDocument();
      expect(within(pro).getByText("Cota de SCs")).toBeInTheDocument();
      expect(within(pro).getByText("Ilimitada")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
  });
});
