"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/http-error";
import { billingService } from "@/services/billing.service";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Invoice,
  PaymentMethod,
  SubscriptionPlan,
} from "@/types";
import { SubscriptionStatusCard } from "./SubscriptionStatusCard";
import { QuotaUsageCard } from "./QuotaUsageCard";
import { PlanSelector } from "./PlanSelector";
import { PaymentMethodSection } from "./PaymentMethodSection";
import { InvoicesList } from "./InvoicesList";
import { Modal } from "@/components/ui/Modal";
import { Loader2, RotateCcw, XCircle } from "lucide-react";

export function BillingSection() {
  const { user, subscription, refreshSubscription, subscriptionLoading } =
    useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);

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

  const loadMethods = useCallback(async () => {
    setLoadingMethods(true);
    try {
      const data = await billingService.listPaymentMethods();
      setMethods(data);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setLoadingMethods(false);
    }
  }, [showToast]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const { records } = await billingService.listInvoices(0, 50);
      setInvoices(records);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setLoadingInvoices(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
    loadMethods();
    loadInvoices();
  }, [loadPlans, loadMethods, loadInvoices]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!subscription) return;
    if (
      plan.id === subscription.subscription.planId ||
      plan.id === subscription.subscription.nextPlanId
    ) {
      return;
    }
    try {
      setChangingPlanId(plan.id);
      await billingService.changePlan(plan.id);
      showToast(
        "Mudança de plano agendada para o próximo ciclo.",
        "success",
      );
      await refreshSubscription();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setChangingPlanId(null);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await billingService.cancel();
      showToast(
        "Assinatura agendada para encerrar no fim do ciclo.",
        "success",
      );
      setShowCancelModal(false);
      await refreshSubscription();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleResume = async () => {
    try {
      setResuming(true);
      await billingService.resume();
      showToast("Cancelamento revertido.", "success");
      await refreshSubscription();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setResuming(false);
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

  return (
    <>
      <div className="space-y-6">
        <SubscriptionStatusCard detail={subscription} />
        <QuotaUsageCard quota={subscription.quota} />

        <div className="flex flex-wrap gap-3">
          {sub.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              onClick={handleResume}
              isLoading={resuming}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reativar assinatura
            </Button>
          ) : (
            sub.status !== "canceled" &&
            sub.status !== "suspended" && (
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                Cancelar assinatura
              </Button>
            )
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {sub.status === "trialing"
              ? "Escolha o plano para continuar após o trial"
              : "Planos disponíveis"}
          </h3>
          <PlanSelector
            plans={plans}
            currentPlanId={sub.planId}
            nextPlanId={sub.nextPlanId}
            onSelect={handleSelectPlan}
            loading={loadingPlans}
            changingPlanId={changingPlanId}
          />
        </div>

        <PaymentMethodSection
          methods={methods}
          loading={loadingMethods}
          onChanged={() => {
            loadMethods();
            refreshSubscription();
          }}
          defaults={
            user
              ? {
                  holderInfoName: user.name,
                  holderInfoEmail: user.email,
                  holderInfoCpfCnpj: user.cpf ?? undefined,
                  holderInfoPhone: user.phone ?? undefined,
                }
              : undefined
          }
        />

        <InvoicesList invoices={invoices} loading={loadingInvoices} />
      </div>

      <Modal
        isOpen={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        title="Cancelar assinatura"
        size="sm"
      >
        <div className="p-5 md:p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Sua assinatura será encerrada ao final do ciclo atual (
            {new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}). Até
            lá, você continua com acesso normal. Você pode reativar a qualquer
            momento antes do encerramento.
          </p>
          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              isLoading={cancelling}
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}
