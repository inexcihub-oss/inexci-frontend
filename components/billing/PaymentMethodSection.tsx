"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/http-error";
import { billingService } from "@/services/billing.service";
import type { PaymentMethod } from "@/types";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { AddCardModal } from "./AddCardModal";
import { CreditCard, Plus, Trash2 } from "lucide-react";

interface Props {
  methods: PaymentMethod[];
  loading: boolean;
  onChanged: () => void;
  defaults?: React.ComponentProps<typeof AddCardModal>["defaults"];
}

export function PaymentMethodSection({
  methods,
  loading,
  onChanged,
  defaults,
}: Props) {
  const { toast, showToast, hideToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleConfirmRemove = async () => {
    if (!deletingId) return;
    try {
      setRemoving(true);
      await billingService.removePaymentMethod(deletingId);
      showToast("Cartão removido.", "success");
      setDeletingId(null);
      onChanged();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Métodos de pagamento
            </h3>
            <p className="text-sm text-gray-500">
              Cartões usados para a cobrança recorrente da assinatura.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar cartão
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {loading ? (
            <p className="text-sm text-gray-500 py-4">Carregando cartões...</p>
          ) : methods.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Nenhum cartão cadastrado.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Cadastre um cartão para ativar a assinatura ao final do trial.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {methods.map((method) => (
                <li
                  key={method.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {method.brand.toUpperCase()} •••• {method.last4}
                        {method.isDefault && (
                          <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            Padrão
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {method.holderName} · Expira{" "}
                        {String(method.expMonth).padStart(2, "0")}/
                        {String(method.expYear).slice(-2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingId(method.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                    aria-label="Remover cartão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddCardModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={onChanged}
        defaults={defaults}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingId}
        title="Remover cartão"
        description="Esta ação removerá o cartão da sua conta. Se ele estiver sendo usado para a cobrança recorrente, sua assinatura poderá ficar sem método de pagamento."
        onConfirm={handleConfirmRemove}
        onCancel={() => setDeletingId(null)}
        loading={removing}
      />

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
