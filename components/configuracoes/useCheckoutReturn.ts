import { useEffect, useRef } from "react";
import type { ToastType } from "@/types/toast.types";
import type { SubscriptionDetail } from "@/types";

function clearCheckoutParamFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  window.history.replaceState({}, "", url.toString());
}

export function useCheckoutReturn({
  checkoutParam,
  subscription,
  refreshSubscription,
  showToast,
  openPlanTab,
}: {
  checkoutParam: string | null;
  subscription: SubscriptionDetail | null;
  refreshSubscription: () => Promise<unknown>;
  showToast: (message: string, type?: ToastType) => void;
  openPlanTab: () => void;
}) {
  const checkoutMessageShownRef = useRef(false);
  const checkoutPollingStartedRef = useRef(false);
  const checkoutPollingFinishedRef = useRef(false);
  const openPlanTabRef = useRef(openPlanTab);
  openPlanTabRef.current = openPlanTab;

  useEffect(() => {
    if (!checkoutParam || checkoutMessageShownRef.current) return;

    if (checkoutParam === "success") {
      checkoutMessageShownRef.current = true;
      showToast(
        "Assinatura ativada! Pode levar alguns segundos para refletir.",
        "success",
      );
      openPlanTabRef.current();
    } else if (checkoutParam === "cancel") {
      checkoutMessageShownRef.current = true;
      showToast("Checkout cancelado. Você pode assinar quando quiser.", "info");
      openPlanTabRef.current();
      clearCheckoutParamFromUrl();
    }
  }, [checkoutParam, showToast]);

  const status = subscription?.subscription.status;

  useEffect(() => {
    if (checkoutParam !== "success") return;
    if (checkoutPollingFinishedRef.current || checkoutPollingStartedRef.current)
      return;

    const stillBlocked = status === "canceled" || status === "suspended";

    if (!stillBlocked) {
      checkoutPollingFinishedRef.current = true;
      clearCheckoutParamFromUrl();
      return;
    }

    checkoutPollingStartedRef.current = true;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      await refreshSubscription();

      if (attempts >= maxAttempts) {
        checkoutPollingFinishedRef.current = true;
        clearInterval(intervalId);
        clearCheckoutParamFromUrl();
        showToast(
          "Pagamento confirmado, mas a atualização ainda está processando. Aguarde alguns instantes e recarregue a página.",
          "info",
        );
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 2500);

    void poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [checkoutParam, status, refreshSubscription, showToast]);
}
