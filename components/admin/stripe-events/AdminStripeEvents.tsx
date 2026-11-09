"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, OctagonX } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { AdminPager } from "@/components/admin/AdminPager";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { adminKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { adminService, type AdminStripeEvent } from "@/services/admin.service";
import { ReprocessStripeEventModal } from "./ReprocessStripeEventModal";
import { StripeEventsList } from "./StripeEventsList";

export const STRIPE_EVENTS_PAGE_SIZE = 20;

const VIEWS = [
  { id: "problemas", label: "Com problema" },
  { id: "todos", label: "Todos" },
] as const;

export function AdminStripeEvents() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const all = searchParams.get("ver") === "todos";
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);
  const [reprocessing, setReprocessing] = useState<AdminStripeEvent | null>(
    null,
  );

  const params = {
    ...(all ? {} : { problems: true }),
    limit: STRIPE_EVENTS_PAGE_SIZE,
    offset: (page - 1) * STRIPE_EVENTS_PAGE_SIZE,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.stripeEvents(params),
    queryFn: () => adminService.listStripeEvents(params),
    placeholderData: (previous) => previous,
  });

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const pages = data
    ? Math.max(Math.ceil(data.total / STRIPE_EVENTS_PAGE_SIZE), 1)
    : 1;

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">
              Eventos da Stripe
            </h1>
            <p className="text-xs text-neutral-500">
              Avisos de pagamento e assinatura recebidos da Stripe e se a
              plataforma conseguiu aplicá-los
            </p>
          </div>
          <div className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
            <div
              role="group"
              aria-label="Eventos exibidos"
              className="ds-segmented"
            >
              {VIEWS.map((view) => {
                const active = (view.id === "todos") === all;
                return (
                  <button
                    key={view.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      update({
                        ver: view.id === "todos" ? "todos" : null,
                        pagina: null,
                      })
                    }
                    className={cn(
                      "ds-segmented-item whitespace-nowrap",
                      active && "ds-segmented-item-active",
                    )}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-auto p-3 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar os eventos"
              description="Tente novamente em instantes."
            />
          ) : (
            <>
              <AdminStatGrid columns={2} className="max-w-2xl">
                <AdminStatCard
                  icon={OctagonX}
                  accent={data.counts.failed > 0 ? "red" : "slate"}
                  tone={data.counts.failed > 0 ? "danger" : "default"}
                  label="Com erro"
                  value={data.counts.failed}
                  hint="A plataforma tentou aplicar e falhou"
                />
                <AdminStatCard
                  icon={Clock}
                  accent={data.counts.stalePending > 0 ? "amber" : "slate"}
                  tone={data.counts.stalePending > 0 ? "warning" : "default"}
                  label="Pendentes há mais de 1 h"
                  value={data.counts.stalePending}
                  hint="Recebidos e ainda não aplicados"
                />
              </AdminStatGrid>
              <AdminSection
                title={all ? "Todos os eventos" : "Eventos com problema"}
                accent="violet"
                description="Avisos sobre a assinatura não identificada indicam que o status da conta não foi atualizado pelo evento"
              >
                <StripeEventsList
                  items={data.items}
                  emptyTitle={
                    all
                      ? "Nenhum evento recebido"
                      : "Nenhum evento com problema"
                  }
                  emptyDescription={
                    all
                      ? "Os avisos que a Stripe enviar aparecem aqui."
                      : "Todos os eventos recebidos foram aplicados."
                  }
                  onReprocess={setReprocessing}
                />
                <AdminPager
                  page={page}
                  pages={pages}
                  onPageChange={(p) => update({ pagina: String(p) })}
                />
              </AdminSection>
            </>
          )}
        </div>
      </div>
      {reprocessing && (
        <ReprocessStripeEventModal
          event={reprocessing}
          onClose={() => setReprocessing(null)}
        />
      )}
    </PageContainer>
  );
}
