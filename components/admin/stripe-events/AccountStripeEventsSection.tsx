"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminPager } from "@/components/admin/AdminPager";
import { AdminSection } from "@/components/admin/AdminStatCard";
import Loading from "@/components/ui/Loading";
import { adminKeys } from "@/lib/query-keys";
import { adminService, type AdminStripeEvent } from "@/services/admin.service";
import { ReprocessStripeEventModal } from "./ReprocessStripeEventModal";
import { StripeEventsList } from "./StripeEventsList";

export const ACCOUNT_STRIPE_EVENTS_PAGE_SIZE = 10;

export function AccountStripeEventsSection({ ownerId }: { ownerId: string }) {
  const [page, setPage] = useState(1);
  const [reprocessing, setReprocessing] = useState<AdminStripeEvent | null>(
    null,
  );
  const params = {
    ownerId,
    limit: ACCOUNT_STRIPE_EVENTS_PAGE_SIZE,
    offset: (page - 1) * ACCOUNT_STRIPE_EVENTS_PAGE_SIZE,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.stripeEvents(params),
    queryFn: () => adminService.listStripeEvents(params),
    placeholderData: (previous) => previous,
  });

  const pages = data
    ? Math.max(Math.ceil(data.total / ACCOUNT_STRIPE_EVENTS_PAGE_SIZE), 1)
    : 1;

  return (
    <AdminSection
      title="Eventos da Stripe"
      accent="violet"
      description="Avisos que a Stripe enviou sobre esta conta e se a plataforma conseguiu aplicá-los"
      action={
        <Link href="/admin/stripe" className="ds-toolbar-btn">
          Ver todos
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loading size="lg" />
        </div>
      ) : isError || !data ? (
        <p className="ds-caption rounded-2xl border border-gray-200 bg-white p-4">
          Não foi possível carregar os eventos da Stripe.
        </p>
      ) : (
        <>
          <StripeEventsList
            items={data.items}
            showAccount={false}
            emptyTitle="Nenhum evento da Stripe"
            emptyDescription="Esta conta ainda não recebeu avisos da Stripe."
            onReprocess={setReprocessing}
          />
          <AdminPager page={page} pages={pages} onPageChange={setPage} />
        </>
      )}
      {reprocessing && (
        <ReprocessStripeEventModal
          event={reprocessing}
          onClose={() => setReprocessing(null)}
        />
      )}
    </AdminSection>
  );
}
