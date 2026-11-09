"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { adminKeys } from "@/lib/query-keys";
import { formatBrlCents, formatSpDate } from "@/lib/admin-format";
import { adminService } from "@/services/admin.service";

interface Props {
  couponId: string;
  code: string;
  onClose: () => void;
}

export function CouponRedemptionsDrawer({ couponId, code, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.couponRedemptions(couponId),
    queryFn: () => adminService.listCouponRedemptions(couponId),
  });

  return (
    <Modal isOpen onClose={onClose} title={`Usos de ${code}`} variant="drawer">
      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loading size="lg" />
          </div>
        ) : isError || !data ? (
          <EmptyState title="Não foi possível carregar os usos" />
        ) : data.items.length === 0 ? (
          <EmptyState title="Nenhuma conta usou este cupom" />
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {data.items.map((r) => (
              <li key={r.ownerId} className="space-y-1 px-3 py-3 text-sm">
                <Link
                  href={`/admin/clientes/${r.ownerId}`}
                  className="font-medium text-primary-700 hover:underline"
                >
                  {r.ownerName}
                </Link>
                <p className="text-xs text-gray-500">{r.ownerEmail}</p>
                <p className="text-xs text-gray-600">
                  Primeira fatura em {formatSpDate(r.firstInvoiceAt)} ·{" "}
                  {r.invoicesCount === 1
                    ? "1 fatura"
                    : `${r.invoicesCount} faturas`}{" "}
                  · {formatBrlCents(r.totalDiscountCents)} de desconto
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
