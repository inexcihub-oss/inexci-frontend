"use client";

import { useState, useEffect } from "react";
import {
  loadStripe,
  type Stripe as StripeType,
  type StripeCardElement,
  type StripeElements,
} from "@stripe/stripe-js";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/http-error";
import { billingService } from "@/services/billing.service";
import { ShieldCheck, Lock } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCardModal({ isOpen, onClose, onSuccess }: Props) {
  const { toast, showToast, hideToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [holderNameError, setHolderNameError] = useState("");
  const [stripe, setStripe] = useState<StripeType | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(
    null,
  );
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    stripePromise.then((s) => {
      if (!isMounted || !s) return;
      setStripe(s);
      const els = s.elements({ locale: "pt-BR" });
      setElements(els);
      const card = els.create("card", {
        style: {
          base: {
            fontSize: "14px",
            color: "#111827",
            fontFamily: "inherit",
            "::placeholder": { color: "#9CA3AF" },
          },
          invalid: { color: "#DC2626" },
        },
        hidePostalCode: true,
      });
      setCardElement(card);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!cardElement) return;
    const container = document.getElementById("stripe-card-element");
    if (container) {
      cardElement.mount(container);
      cardElement.on("change", (e) => {
        setCardError(e.error?.message ?? "");
      });
    }
    return () => {
      cardElement.unmount();
    };
  }, [cardElement]);

  const handleClose = () => {
    if (submitting) return;
    setHolderName("");
    setHolderNameError("");
    setCardError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !cardElement) {
      showToast("Stripe não carregado. Tente novamente.", "error");
      return;
    }

    let valid = true;
    if (!holderName.trim() || holderName.trim().length < 2) {
      setHolderNameError("Informe o nome do titular");
      valid = false;
    } else {
      setHolderNameError("");
    }
    if (!valid) return;

    try {
      setSubmitting(true);
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { name: holderName.trim() },
      });

      if (error || !paymentMethod) {
        showToast(error?.message ?? "Erro ao processar cartão.", "error");
        return;
      }

      const card = paymentMethod.card!;
      await billingService.addPaymentMethod({
        paymentMethodId: paymentMethod.id,
        holderName: holderName.trim(),
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
      });

      showToast("Cartão cadastrado com sucesso.", "success");
      setHolderName("");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Suprimir variável não utilizada (elements é mantida por simetria com a API Stripe)
  void elements;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Cadastrar cartão de crédito"
        size="md"
      >
        <form
          onSubmit={handleSubmit}
          noValidate
          className="p-5 md:p-6 space-y-5"
        >
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Os dados do cartão são coletados diretamente pelo Stripe (PCI-DSS
              nível 1). Nunca passam pelo nosso servidor.
            </span>
          </div>

          <div className="space-y-3">
            <Input
              label="Nome impresso no cartão"
              autoComplete="cc-name"
              placeholder="Como aparece no cartão"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              error={holderNameError}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dados do cartão <span className="text-red-500">*</span>
              </label>
              <div
                id="stripe-card-element"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition"
              />
              {cardError && (
                <p className="mt-1 text-xs text-red-600">{cardError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Conexão criptografada — TLS 1.2+
          </div>

          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Salvar cartão
            </Button>
          </div>
        </form>
      </Modal>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
}
