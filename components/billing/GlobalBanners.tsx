"use client";

import { useAuth } from "@/contexts/AuthContext";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { QuotaBanner } from "@/components/billing/QuotaBanner";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { resolveBillingBanner } from "@/lib/billing-banner";

/**
 * Faixa de aviso no topo do dashboard — **um banner por vez**.
 *
 * Banners empilhados comeriam metade da tela no mobile, então há precedência,
 * da mais para a menos urgente: **assinatura → cota → onboarding**.
 *
 * - Problema de assinatura (suspensa, inadimplente, trial acabando) vence
 *   consumo de cota — não adianta oferecer upgrade de plano a quem está com o
 *   pagamento pendente.
 * - Consumo de cota vence o convite a continuar o tour de primeiros passos —
 *   um aviso de negócio (você vai perder acesso a enviar solicitações) importa
 *   mais do que um convite para aprender a plataforma.
 * - O onboarding só aparece quando não há nada mais urgente a dizer. Ele cede
 *   a vez através do `fallback` do `QuotaBanner`: como a decisão de mostrar o
 *   aviso de cota depende de dado assíncrono (quota, dispensa por
 *   localStorage), replicar essa lógica aqui só para decidir precedência
 *   duplicaria a fonte de verdade — o próprio `QuotaBanner` decide, e devolve
 *   o controle quando não tem nada a mostrar.
 *
 * O banner de assinatura é só do dono da conta; os de cota e onboarding
 * alcançam também médicos e colaboradores.
 *
 * Precisa renderizar DENTRO do `OnboardingProvider` (ver
 * `DashboardLayoutInner`) — é de lá que `OnboardingBanner` lê o progresso.
 */
export function GlobalBanners() {
  const { isAccountOwner, subscription, subscriptionLoading } = useAuth();

  const billingVariant = isAccountOwner
    ? resolveBillingBanner(subscription)
    : null;

  if (billingVariant) {
    return <BillingStatusBanner variant={billingVariant} />;
  }

  // Enquanto a assinatura do dono não resolveu, segurar os demais banners evita
  // que eles apareçam e sejam substituídos logo em seguida pelo de assinatura.
  if (isAccountOwner && subscriptionLoading) return null;

  return <QuotaBanner fallback={<OnboardingBanner />} />;
}
