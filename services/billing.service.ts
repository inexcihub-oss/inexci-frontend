import api from "@/lib/api";
import type { QuotaStatus, SubscriptionDetail, SubscriptionPlan } from "@/types";

export const billingService = {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>("/billing/plans");
    return data;
  },

  async getQuota(): Promise<QuotaStatus | null> {
    const { data } = await api.get<QuotaStatus | null>("/billing/quota");
    return data ?? null;
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

  async openPortal(planId?: string): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>(
      "/billing/subscription/portal",
      planId ? { planId } : {},
    );
    return data;
  },
};
