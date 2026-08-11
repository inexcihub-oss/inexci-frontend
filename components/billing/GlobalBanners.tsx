"use client";

import { useAuth } from "@/contexts/AuthContext";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { QuotaBanner } from "@/components/billing/QuotaBanner";
import { resolveBillingBanner } from "@/lib/billing-banner";

/**
 * Faixa de aviso no topo do dashboard — **um banner por vez**.
 *
 * Dois banners empilhados comeriam metade da tela no mobile, então há
 * precedência: problema de assinatura (suspensa, inadimplente, trial acabando)
 * vence consumo de cota. Não adianta oferecer upgrade de plano a quem está com
 * o pagamento pendente.
 *
 * O banner de assinatura é só do dono da conta; o de cota alcança também
 * médicos e colaboradores com permissão de solicitações.
 */
export function GlobalBanners() {
  const { isAccountOwner, subscription, subscriptionLoading } = useAuth();

  const billingVariant = isAccountOwner
    ? resolveBillingBanner(subscription)
    : null;

  if (billingVariant) {
    return <BillingStatusBanner variant={billingVariant} />;
  }

  // Enquanto a assinatura do dono não resolveu, segurar o banner de cota evita
  // que ele apareça e seja substituído logo em seguida pelo de assinatura.
  if (isAccountOwner && subscriptionLoading) return null;

  return <QuotaBanner />;
}
