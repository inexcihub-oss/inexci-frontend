"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/http-error";
import { billingService } from "@/services/billing.service";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionPlan } from "@/types";
import { SubscriptionStatusCard } from "./SubscriptionStatusCard";
import { QuotaUsageCard } from "./QuotaUsageCard";
import { PlanSelector } from "./PlanSelector";
import { ExternalLink, Layers, Loader2 } from "lucide-react";

export function BillingSection() {
  const { subscription, subscriptionLoading, refreshSubscription } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const data = await billingService.listPlans();
      setPlans(data);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setLoadingPlans(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const handleCheckout = async (plan: SubscriptionPlan) => {
    try {
      setRedirecting(true);
      const { url } = await billingService.startCheckout(plan.id);
      window.location.href = url;
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
      setRedirecting(false);
    }
  };

  const handleManage = async () => {
    try {
      setRedirecting(true);
      const { url } = await billingService.openPortal();
      window.location.href = url;
    } catch (err) {
      showToast(
        "Não foi possível abrir o Portal da Stripe agora. Escolha um plano abaixo para reativar seu acesso.",
        "warning",
      );
      setIsPlansModalOpen(true);
      setRedirecting(false);
    }
  };

  if (subscriptionLoading && !subscription) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card className="border border-gray-200 rounded-2xl">
        <CardContent className="p-6 text-sm text-gray-500">
          Assinatura ainda não disponível para esta conta.
        </CardContent>
      </Card>
    );
  }

  const sub = subscription.subscription;
  const isTrialing = sub.status === "trialing";
  const isCanceled = sub.status === "canceled";
  const isSuspendedOrPastDue =
    sub.status === "suspended" || sub.status === "past_due";

  return (
    <>
      <div className="space-y-6">
        <SubscriptionStatusCard detail={subscription} />
        <QuotaUsageCard quota={subscription.quota} />

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Resolver assinatura
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            {isCanceled && (
              <Button
                onClick={() => setIsPlansModalOpen(true)}
                className="gap-2"
                isLoading={redirecting}
              >
                <Layers className="w-4 h-4" />
                Contratar novo plano na Stripe
              </Button>
            )}

            {isSuspendedOrPastDue && (
              <Button
                onClick={handleManage}
                isLoading={redirecting}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Regularizar pagamento na Stripe
              </Button>
            )}

            {!isCanceled && !isTrialing && !isSuspendedOrPastDue && (
              <Button
                variant="outline"
                onClick={handleManage}
                isLoading={redirecting}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Gerenciar assinatura na Stripe
              </Button>
            )}

            <Button
              variant={isCanceled ? "outline" : "ghost"}
              onClick={() => setIsPlansModalOpen(true)}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              {isCanceled ? "Ver todos os planos" : "Trocar plano"}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        title={
          isTrialing
            ? "Escolha o plano para continuar após o trial"
            : "Planos disponíveis"
        }
        size="xl"
      >
        <div className="p-5 md:p-6">
          <PlanSelector
            plans={plans}
            currentPlanId={sub.planId}
            subscriptionStatus={sub.status}
            onCheckout={handleCheckout}
            onManage={handleManage}
            loading={loadingPlans}
            redirecting={redirecting}
          />
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
}
