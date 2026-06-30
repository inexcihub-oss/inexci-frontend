import api from "@/lib/api";
import type { SubscriptionDetail, SubscriptionPlan } from "@/types";

export const billingService = {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>("/billing/plans");
    return data;
  },

  async getMySubscription(): Promise<SubscriptionDetail> {
    const { data } = await api.get<SubscriptionDetail>("/billing/subscription");
    return data;
  },

  async startCheckout(planId: string): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>(
      "/billing/subscription/checkout",
      { planId },
    );
    return data;
  },

  async openPortal(): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>(
      "/billing/subscription/portal",
    );
    return data;
  },
};
