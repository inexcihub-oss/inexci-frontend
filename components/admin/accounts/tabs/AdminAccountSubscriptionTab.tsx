import { useQuery } from "@tanstack/react-query";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { adminKeys } from "@/lib/query-keys";
import { formatBrlCents } from "@/lib/admin-format";
import { adminService } from "@/services/admin.service";
import { AccountStripeEventsSection } from "@/components/admin/stripe-events/AccountStripeEventsSection";
import { formatDate } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

const date = (iso: string | null | undefined) => (iso ? formatDate(iso) : "—");

export function AdminAccountSubscriptionTab({ ownerId }: { ownerId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountSubscription(ownerId),
    queryFn: () => adminService.getAccountSubscription(ownerId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Não foi possível carregar a assinatura" />;
  }

  const { gateway } = data;
  const discount = gateway?.discount;

  return (
    <div className="space-y-4">
      {data.gatewayError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Não foi possível consultar a Stripe agora. Os dados abaixo vêm do
          banco da plataforma e podem estar desatualizados.
        </div>
      )}
      <section className="rounded-2xl border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-semibold">Plataforma</h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Situação" value={<AdminStatusBadge account={data} />} />
          <Field label="Plano" value={data.plan.name} />
          <Field
            label="Mensalidade"
            value={
              data.monthlyAmountCents > 0
                ? formatBrlCents(data.monthlyAmountCents)
                : null
            }
          />
          <Field label="Fim do trial" value={date(data.trialEndsAt)} />
          <Field
            label="Início do período"
            value={date(data.currentPeriodStart)}
          />
          <Field label="Fim do período" value={date(data.currentPeriodEnd)} />
          <Field
            label="Cancela no fim do período"
            value={data.cancelAtPeriodEnd ? "Sim" : "Não"}
          />
          <Field label="Inadimplente desde" value={date(data.pastDueSince)} />
        </dl>
      </section>
      <section className="rounded-2xl border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-semibold">Stripe</h2>
        {gateway ? (
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Field label="Status na Stripe" value={gateway.status} />
            <Field label="Fim do trial" value={date(gateway.trialEndsAt)} />
            <Field
              label="Fim do período"
              value={date(gateway.currentPeriodEnd)}
            />
            <Field
              label="Cancela no fim do período"
              value={gateway.cancelAtPeriodEnd ? "Sim" : "Não"}
            />
            <Field
              label="Desconto"
              value={
                discount
                  ? [
                      discount.name,
                      discount.percentOff != null
                        ? `${discount.percentOff}%`
                        : discount.amountOffCents != null
                          ? formatBrlCents(discount.amountOffCents)
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Nenhum"
              }
            />
            <Field
              label="Forma de pagamento"
              value={
                gateway.hasPaymentMethod
                  ? `${gateway.paymentBrand ?? "Cartão"} •••• ${gateway.paymentLast4 ?? ""}`
                  : "Não cadastrada"
              }
            />
            <Field label="Cliente" value={data.gatewayCustomerId} />
            <Field label="Assinatura" value={data.gatewaySubscriptionId} />
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            Esta conta não tem assinatura na Stripe.
          </p>
        )}
      </section>
      <AccountStripeEventsSection ownerId={ownerId} />
    </div>
  );
}
