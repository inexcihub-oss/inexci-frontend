"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { adminKeys } from "@/lib/query-keys";
import { formatSpDate } from "@/lib/admin-format";
import {
  COUPON_SITUATION_META,
  describeCouponDiscount,
  describeCouponUses,
} from "@/lib/admin-coupon";
import { cn } from "@/lib/utils";
import { adminService, type AdminCoupon } from "@/services/admin.service";
import { NewCouponModal } from "./NewCouponModal";
import { DeactivateCouponModal } from "./DeactivateCouponModal";
import { CouponRedemptionsDrawer } from "./CouponRedemptionsDrawer";

export function AdminCoupons() {
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<AdminCoupon | null>(null);
  const [viewing, setViewing] = useState<AdminCoupon | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.coupons(),
    queryFn: () => adminService.listCoupons(),
  });

  const items = data?.items ?? [];

  const columns: AdminColumn<AdminCoupon>[] = [
    {
      key: "codigo",
      header: "Código",
      mobile: "title",
      cell: (c) => (
        <>
          <span className="font-medium text-gray-900">{c.code}</span>
          {c.restrictedToPlans && (
            <p className="text-xs font-normal text-gray-500">
              {c.plans.map((p) => p.name).join(", ")}
            </p>
          )}
        </>
      ),
    },
    {
      key: "desconto",
      header: "Desconto",
      cell: (c) => describeCouponDiscount(c),
    },
    {
      key: "usos",
      header: "Usos",
      className: "text-right",
      headClassName: "text-right",
      cell: (c) => describeCouponUses(c),
    },
    {
      key: "validade",
      header: "Validade",
      className: "whitespace-nowrap",
      cell: (c) => (c.expiresAt ? formatSpDate(c.expiresAt) : "Sem validade"),
    },
    {
      key: "situacao",
      header: "Situação",
      mobile: "badge",
      cell: (c) => {
        const meta = COUPON_SITUATION_META[c.situation];
        return (
          <span
            className={cn("ds-badge-md whitespace-nowrap", meta.className)}
            data-situation={c.situation}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      mobileLabel: "Ações",
      mobile: "full",
      className: "whitespace-nowrap text-right",
      cell: (c) => (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            className="ds-btn-inline"
            onClick={() => setViewing(c)}
          >
            Ver usos
          </button>
          {c.active && (
            <button
              type="button"
              className="ds-btn-inline text-red-600"
              onClick={() => setDeactivating(c)}
            >
              Desativar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">Cupons</h1>
            <p className="text-xs text-neutral-500">
              Códigos promocionais aceitos no checkout da Stripe
            </p>
          </div>
          <button
            type="button"
            className="ds-toolbar-btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo cupom
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {data?.truncated && (
            <p
              role="status"
              className="mx-3 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 lg:mx-6"
            >
              Mostrando os 100 cupons mais recentes
            </p>
          )}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Não foi possível carregar os cupons"
              description="Tente novamente em instantes."
            />
          ) : items.length === 0 ? (
            <EmptyState title="Nenhum cupom criado" />
          ) : (
            <AdminDataTable
              rows={items}
              columns={columns}
              rowKey={(c) => c.id}
            />
          )}
        </div>
      </div>

      {creating && <NewCouponModal isOpen onClose={() => setCreating(false)} />}
      {deactivating && (
        <DeactivateCouponModal
          isOpen
          couponId={deactivating.id}
          code={deactivating.code}
          onClose={() => setDeactivating(null)}
        />
      )}
      {viewing && (
        <CouponRedemptionsDrawer
          couponId={viewing.id}
          code={viewing.code}
          onClose={() => setViewing(null)}
        />
      )}
    </PageContainer>
  );
}
