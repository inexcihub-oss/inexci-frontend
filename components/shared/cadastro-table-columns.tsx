"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui";

/**
 * Colunas padrão (seleção + excluir) das tabelas de cadastro básico
 * (hospitais, convênios, fornecedores, fabricantes...). Só existem para
 * alimentar ações que exigem permissão — quem não tem a permissão da tela
 * não deve receber essas colunas, então o próprio caller decide se inclui
 * `createSelectColumn`/`createDeleteActionColumn` no array de `columns`.
 */

/**
 * Coluna de checkbox de seleção. Por padrão usa a paginação da tabela
 * (`getIsAllPageRowsSelected`); passe `allRows: true` para tabelas sem
 * paginação de página (ex.: a lista de modelos de procedimento usa
 * `getIsAllRowsSelected`).
 */
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

/** Ícone de lixeira usado nas colunas de ação das tabelas de cadastro. */
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

/** Coluna com o botão de excluir por linha (abre o modal de confirmação). */
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
