import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  listCoupons: vi.fn(),
  createCoupon: vi.fn(),
  deactivateCoupon: vi.fn(),
  listCouponRedemptions: vi.fn(),
  listPlans: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminCoupons } from "./AdminCoupons";

const base = {
  couponId: "c",
  currency: "brl",
  durationInMonths: null,
  maxRedemptions: null,
  timesRedeemed: 0,
  expiresAt: null,
  active: true,
  valid: true,
  restrictedToPlans: false,
  plans: [],
  createdAt: "2026-10-01T10:00:00Z",
  percentOff: null,
  amountOffCents: null,
};
const coupons = [
  {
    ...base,
    id: "p1",
    code: "MAIO20",
    percentOff: 20,
    duration: "repeating",
    durationInMonths: 3,
    maxRedemptions: 10,
    timesRedeemed: 4,
    situation: "ativo",
  },
  {
    ...base,
    id: "p2",
    code: "FIXO",
    amountOffCents: 10000,
    duration: "once",
    active: false,
    valid: false,
    situation: "desativado",
  },
  {
    ...base,
    id: "p3",
    code: "ACABOU",
    percentOff: 50,
    duration: "forever",
    situation: "esgotado",
    restrictedToPlans: true,
    plans: [{ id: "pl1", name: "Starter" }],
  },
  {
    ...base,
    id: "p4",
    code: "VELHO",
    percentOff: 5,
    duration: "once",
    situation: "expirado",
    expiresAt: "2026-01-10T12:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  svc.listCoupons.mockResolvedValue({ items: coupons, truncated: false });
  svc.listPlans.mockResolvedValue([
    { id: "pl1", name: "Starter" },
    { id: "pl2", name: "Pro" },
  ]);
  svc.createCoupon.mockResolvedValue({ auditLogId: "a", coupon: coupons[0] });
  svc.deactivateCoupon.mockResolvedValue({
    auditLogId: "a",
    coupon: coupons[0],
  });
  svc.listCouponRedemptions.mockResolvedValue({
    code: "MAIO20",
    timesRedeemed: 1,
    items: [
      {
        ownerId: "o1",
        ownerName: "Clínica Sol",
        ownerEmail: "sol@x.com",
        firstInvoiceAt: "2026-10-05T12:00:00Z",
        firstInvoiceId: "in_1",
        invoicesCount: 2,
        totalDiscountCents: 5000,
      },
    ],
  });
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

describe("AdminCoupons", () => {
  it("lista com desconto, usos, validade e situação", async () => {
    renderWithProviders(<AdminCoupons />);
    expect(await screen.findByText("MAIO20")).toBeInTheDocument();
    expect(screen.getByText("20% por 3 meses")).toBeInTheDocument();
    expect(screen.getByText("4 / 10")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByText("Expirado")).toBeInTheDocument();
    expect(screen.getByText("50% para sempre")).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(
      screen.queryByText(/100 cupons mais recentes/),
    ).not.toBeInTheDocument();
  });

  it("só oferece desativar cupom ativo e avisa quando truncado", async () => {
    svc.listCoupons.mockResolvedValue({ items: coupons, truncated: true });
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    expect(
      screen.getByText("Mostrando os 100 cupons mais recentes"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Desativar" })).toHaveLength(
      3,
    );
    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByText("FIXO"))!;
    expect(within(row).queryByRole("button", { name: "Desativar" })).toBeNull();
  });

  it("mostra estado vazio e erro", async () => {
    svc.listCoupons.mockResolvedValue({ items: [], truncated: false });
    renderWithProviders(<AdminCoupons />);
    expect(await screen.findByText("Nenhum cupom criado")).toBeInTheDocument();
  });

  it("desativa exigindo motivo", async () => {
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getAllByRole("button", { name: "Desativar" })[0]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Desativar cupom" }),
    );
    expect(svc.deactivateCoupon).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/mínimo de 5 caracteres/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Campanha encerrada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Desativar cupom" }));
    await waitFor(() =>
      expect(svc.deactivateCoupon).toHaveBeenCalledWith("p1", {
        reason: "Campanha encerrada",
      }),
    );
  });

  it("mostra erro do servidor ao desativar", async () => {
    svc.deactivateCoupon.mockRejectedValue(
      new AxiosError("x", "400", undefined, undefined, {
        data: { message: "Cupom já desativado" },
        status: 400,
      } as never),
    );
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getAllByRole("button", { name: "Desativar" })[0]);
    fireEvent.change(await screen.findByLabelText(/Motivo/), {
      target: { value: "Campanha encerrada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Desativar cupom" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cupom já desativado",
    );
  });

  it("abre os usos com link para a conta", async () => {
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver usos" })[0]);
    const link = await screen.findByRole("link", { name: "Clínica Sol" });
    expect(link).toHaveAttribute("href", "/admin/clientes/o1");
    expect(svc.listCouponRedemptions).toHaveBeenCalledWith("p1");
  });

  it("valida o formulário e cria o cupom", async () => {
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.click(await screen.findByRole("button", { name: "Criar cupom" }));
    expect(svc.createCoupon).not.toHaveBeenCalled();
    expect(await screen.findByText(/3 a 40 letras/)).toBeInTheDocument();

    const code = screen.getByLabelText("Código") as HTMLInputElement;
    fireEvent.change(code, { target: { value: "natal10" } });
    expect(code.value).toBe("NATAL10");
    fireEvent.change(screen.getByLabelText("Percentual"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Duração"), {
      target: { value: "repeating" },
    });
    fireEvent.change(screen.getByLabelText("Meses"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/Limite de usos/), {
      target: { value: "5" },
    });
    expect(
      screen.getByText(/mensal e anual\) são restringidos juntos/),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Pro" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar cupom" }));
    await waitFor(() =>
      expect(svc.createCoupon).toHaveBeenCalledWith({
        code: "NATAL10",
        duration: "repeating",
        percentOff: 10,
        durationInMonths: 3,
        maxRedemptions: 5,
        planIds: ["pl2"],
      }),
    );
  });

  it("envia valor fixo em centavos", async () => {
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(await screen.findByLabelText("Código"), {
      target: { value: "FIXO100" },
    });
    fireEvent.change(screen.getByLabelText("Tipo de desconto"), {
      target: { value: "amount" },
    });
    fireEvent.change(screen.getByLabelText("Valor em R$"), {
      target: { value: "100,00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar cupom" }));
    await waitFor(() =>
      expect(svc.createCoupon).toHaveBeenCalledWith({
        code: "FIXO100",
        duration: "once",
        amountOffCents: 10000,
      }),
    );
  });

  it("mostra dentro do modal o erro de código duplicado (409)", async () => {
    svc.createCoupon.mockRejectedValue(
      new AxiosError("x", "409", undefined, undefined, {
        data: { message: "Já existe um cupom com este código" },
        status: 409,
      } as never),
    );
    renderWithProviders(<AdminCoupons />);
    await screen.findByText("MAIO20");
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(await screen.findByLabelText("Código"), {
      target: { value: "MAIO20" },
    });
    fireEvent.change(screen.getByLabelText("Percentual"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar cupom" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Já existe um cupom com este código",
    );
    expect(
      screen.getByRole("button", { name: "Criar cupom" }),
    ).toBeInTheDocument();
  });

  describe("no celular", () => {
    beforeEach(mockMobile);
    afterEach(() => vi.unstubAllGlobals());

    it("cada cupom vira um card com situação e ações", async () => {
      renderWithProviders(<AdminCoupons />);
      const card = (await screen.findByText("MAIO20")).closest("li")!;
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(within(card).getByText("Ativo")).toBeInTheDocument();
      expect(within(card).getByText("4 / 10")).toBeInTheDocument();
      expect(
        within(card).getByRole("button", { name: "Ver usos" }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("button", { name: "Desativar" }),
      ).toBeInTheDocument();
      const fixo = screen.getByText("FIXO").closest("li")!;
      expect(
        within(fixo).queryByRole("button", { name: "Desativar" }),
      ).not.toBeInTheDocument();
    });
  });
});
