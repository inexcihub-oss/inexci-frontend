"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui";
import { getAvatarColor, getInitials } from "@/lib/utils";

export function createSelectColumn<T>({
  allRows = false,
}: { allRows?: boolean } = {}): ColumnDef<T> {
  return {
    id: "select",
    size: 40,
    enableSorting: false,
    enableResizing: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          allRows
            ? table.getIsAllRowsSelected()
            : table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(value) =>
          allRows
            ? table.toggleAllRowsSelected(!!value)
            : table.toggleAllPageRowsSelected(!!value)
        }
        indeterminate={
          allRows
            ? table.getIsSomeRowsSelected()
            : table.getIsSomePageRowsSelected()
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  };
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H7a1 1 0 000 2h10z"
      />
    </svg>
  );
}

export function createDeleteActionColumn<T>(
  onDelete: (item: T, e: React.MouseEvent) => void,
  title: string,
): ColumnDef<T> {
  return {
    id: "actions",
    size: 50,
    enableSorting: false,
    enableResizing: false,
    header: () => <div />,
    cell: ({ row }) => (
      <button
        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 active:scale-[0.95] transition-all group min-h-[44px]"
        title={title}
        onClick={(e) => onDelete(row.original, e)}
      >
        <TrashIcon />
      </button>
    ),
  };
}

export function createNameColumn<T extends { id: string; name: string }>({
  onOpen,
  size = 250,
  getAvatarUrl,
}: {
  onOpen: (item: T) => void;
  size?: number;
  getAvatarUrl?: (item: T) => string | null | undefined;
}): ColumnDef<T> {
  return {
    accessorKey: "name",
    header: "Nome",
    size,
    cell: ({ row }) => {
      const avatarUrl = getAvatarUrl?.(row.original);
      return (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() => onOpen(row.original)}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={row.original.name}
              className="w-8 h-8 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${getAvatarColor(String(row.original.id))}`}
            >
              {getInitials(row.original.name)}
            </div>
          )}
          <span
            className="text-xs font-semibold text-black hover:text-primary-600"
            title={row.original.name}
          >
            {row.original.name}
          </span>
        </div>
      );
    },
  };
}

const HIDDEN_BELOW = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

export function createTextColumn<T>({
  key,
  header,
  size,
  format,
  hiddenBelow = "md",
}: {
  key: Extract<keyof T, string>;
  header: string;
  size: number;
  format?: (item: T) => string;
  hiddenBelow?: keyof typeof HIDDEN_BELOW;
}): ColumnDef<T> {
  return {
    accessorKey: key,
    header,
    size,
    meta: { className: HIDDEN_BELOW[hiddenBelow] },
    cell: ({ row }) => {
      const raw = row.original[key];
      const display = format
        ? format(row.original)
        : (typeof raw === "string" && raw) || "-";
      return (
        <span className="text-xs text-black" title={display}>
          {display}
        </span>
      );
    },
  };
}

export function formatCadastroAddress(item: {
  address?: string;
  city?: string;
  state?: string;
}): string {
  const parts = [
    item.address,
    item.city && item.state
      ? `${item.city}/${item.state}`
      : item.city || item.state,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : "-";
}
