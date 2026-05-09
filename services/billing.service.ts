import api from "@/lib/api";
import type {
  Invoice,
  PaymentMethod,
  SavePaymentMethodPayload,
  Subscription,
  SubscriptionDetail,
  SubscriptionPlan,
} from "@/types";

/**
 * Cliente HTTP para o módulo de billing.
 *
 * Endpoints:
 * - GET    /billing/plans                — público, lista planos
 * - GET    /billing/subscription         — detalhe da assinatura do admin
 * - PATCH  /billing/subscription/plan    — agenda troca para o próximo ciclo
 * - DELETE /billing/subscription         — cancela ao fim do ciclo
 * - POST   /billing/subscription/resume  — reverte cancelamento agendado
 * - GET/POST/DELETE /billing/payment-methods
 * - GET    /billing/invoices
 */
export const billingService = {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>("/billing/plans");
    return data;
  },

  async getMySubscription(): Promise<SubscriptionDetail> {
    const { data } = await api.get<SubscriptionDetail>(
      "/billing/subscription",
    );
    return data;
  },

  async changePlan(
    planId: string,
  ): Promise<Pick<Subscription, "id" | "planId" | "nextPlanId">> {
    const { data } = await api.patch<
      Pick<Subscription, "id" | "planId" | "nextPlanId">
    >("/billing/subscription/plan", { planId });
    return data;
  },

  async cancel(): Promise<
    Pick<
      Subscription,
      "id" | "status" | "cancelAtPeriodEnd" | "currentPeriodEnd"
    >
  > {
    const { data } = await api.delete<
      Pick<
        Subscription,
        "id" | "status" | "cancelAtPeriodEnd" | "currentPeriodEnd"
      >
    >("/billing/subscription");
    return data;
  },

  async resume(): Promise<
    Pick<Subscription, "id" | "status" | "cancelAtPeriodEnd">
  > {
    const { data } = await api.post<
      Pick<Subscription, "id" | "status" | "cancelAtPeriodEnd">
    >("/billing/subscription/resume");
    return data;
  },

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get<PaymentMethod[]>(
      "/billing/payment-methods",
    );
    return data;
  },

  async addPaymentMethod(
    payload: SavePaymentMethodPayload,
  ): Promise<PaymentMethod> {
    const { data } = await api.post<PaymentMethod>(
      "/billing/payment-methods",
      payload,
    );
    return data;
  },

  async removePaymentMethod(id: string): Promise<void> {
    await api.delete(`/billing/payment-methods/${id}`);
  },

  async listInvoices(
    skip = 0,
    take = 50,
  ): Promise<{ total: number; records: Invoice[] }> {
    const { data } = await api.get<{ total: number; records: Invoice[] }>(
      "/billing/invoices",
      { params: { skip, take } },
    );
    return data;
  },
};
