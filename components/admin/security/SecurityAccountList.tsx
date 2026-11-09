import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { pluralize } from "@/lib/admin-format";
import type { AdminSecurityAccount } from "@/services/admin.service";

export function SecurityAccountList({
  items,
  empty,
  unit,
}: {
  items: AdminSecurityAccount[];
  empty: string;
  unit: [string, string];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
      {items.map((item) => (
        <li key={item.ownerId}>
          <Link
            href={`/admin/clientes/${item.ownerId}?tab=equipe`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {item.ownerName ?? "Conta sem nome"}
              </span>
              <span className="block text-xs text-gray-500">
                {pluralize(item.users, "usuário", "usuários")} · último em{" "}
                {formatDateTime(item.lastSeenAt)}
              </span>
            </span>
            <span className="ds-badge-sm shrink-0 bg-red-50 text-red-700">
              {pluralize(item.total, unit[0], unit[1])}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-gray-400"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
