"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/Spinner";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import { surgeryRequestListName } from "@/lib/surgery-request-list";
import {
  STATUS_META,
  SurgeryRequestStatusCode,
  getStatusMeta,
} from "@/lib/surgery-request-status";
import { surgeryRequestKeys } from "@/lib/query-keys";

export interface LinkedSurgeryRequestLines {
  primary: string;
  secondary: string;
}

export function linkedProcedureName(
  surgery: SurgeryRequestListItem,
  fallback: string,
): string {
  return surgeryRequestListName(surgery, fallback);
}

interface LinkedSurgeryRequestsListProps {
  title: string;
  loading: boolean;
  requests: SurgeryRequestListItem[];
  emptyMessage: string;
  getLines: (surgery: SurgeryRequestListItem) => LinkedSurgeryRequestLines;
}

export function LinkedSurgeryRequestsList({
  title,
  loading,
  requests,
  emptyMessage,
  getLines,
}: LinkedSurgeryRequestsListProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {!loading && (
          <span className="text-xs text-gray-400">{requests.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          requests.map((surgery) => {
            const meta = getStatusMeta(surgery.status);
            const statusLabel = meta?.label ?? "Pendente";
            const colors =
              meta?.badge ??
              STATUS_META[SurgeryRequestStatusCode.PENDING].badge;
            const { primary, secondary } = getLines(surgery);
            return (
              <div
                key={surgery.id}
                onClick={() => router.push(`/solicitacao/${surgery.id}`)}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {primary}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {secondary}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type LinkedFilter = { hospitalId: string } | { healthPlanId: string };

export function useLinkedSurgeryRequests(
  filter: LinkedFilter,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: [...surgeryRequestKeys.all, "linked", filter] as const,
    queryFn: () => surgeryRequestService.getAll(filter),
    enabled,
  });
  return {
    requests: query.data?.records ?? [],
    loading: enabled && query.isLoading,
  };
}
