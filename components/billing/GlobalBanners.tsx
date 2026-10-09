"use client";

import { useAuth } from "@/contexts/AuthContext";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { QuotaBanner } from "@/components/billing/QuotaBanner";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { resolveBillingBanner } from "@/lib/billing-banner";

export function GlobalBanners() {
  const { isAccountOwner, subscription, subscriptionLoading } = useAuth();

  const billingVariant = isAccountOwner
    ? resolveBillingBanner(subscription)
    : null;

  if (billingVariant) {
    return <BillingStatusBanner variant={billingVariant} />;
  }

  if (isAccountOwner && subscriptionLoading) return null;

  return <QuotaBanner fallback={<OnboardingBanner />} />;
}
