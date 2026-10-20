"use client";

import type { ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table";
import { SearchInput, Button } from "@/components/ui";
import PageContainer from "@/components/PageContainer";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import {
  createSelectColumn,
  createDeleteActionColumn,
} from "@/components/shared/cadastro-table-columns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCadastroList } from "@/hooks/useCadastroList";

type CadastroList<T extends { id: string; name: string }> = ReturnType<
  typeof useCadastroList<T>
>;

export interface CadastroListPageProps<T extends { id: string; name: string }> {
  title: string;
  loading: boolean;
  list: CadastroList<T>;
  columns: ColumnDef<T>[];
  canCreate: boolean;
  canDelete: boolean;
  createLabel: string;
  createDataTour?: string;
  onCreate: () => void;
  bulkDeleteLabel?: string;
  deleteTitle: string;
  bulkDeleteTitle: (count: number) => string;
  bulkDeleteDescription: (count: number) => string;
  softDelete?: boolean;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function CadastroListPage<T extends { id: string; name: string }>({
  title,
  loading,
  list,
  columns,
  canCreate,
  canDelete,
  createLabel,
  createDataTour,
  onCreate,
  bulkDeleteLabel = "Excluir selecionados",
  deleteTitle,
  bulkDeleteTitle,
  bulkDeleteDescription,
  softDelete = false,
  searchPlaceholder = "Buscar por nome ou e-mail",
  children,
}: CadastroListPageProps<T>) {
  const {
    searchTerm,
    setSearchTerm,
    filtered,
    rowSelection,
    setRowSelection,
    sorting,
    setSorting,
    selectedItems,
    deleteState,
    requestDelete,
    confirmDelete,
    cancelDelete,
    bulkDelete,
    openBulkDelete,
    cancelBulkDelete,
    confirmBulkDelete,
  } = list;

  const allColumns: ColumnDef<T>[] = [
    ...(canDelete ? [createSelectColumn<T>()] : []),
    ...columns,
    ...(canDelete
      ? [createDeleteActionColumn<T>(requestDelete, deleteTitle)]
      : []),
  ];

  const table = useReactTable({
    data: filtered,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    enableSorting: true,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
  });

  const selectedCount = selectedItems.length;

  return (
    <PageContainer className="border-gray-200">
      <div className="flex-none flex items-center gap-2 px-4 lg:px-8 py-3 border-b border-gray-200">
        <h1 className="ds-page-title">{title}</h1>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-gray-200">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={searchPlaceholder}
          className="w-full sm:flex-1 lg:w-85 lg:flex-none"
        />

        <div className="hidden sm:block w-px h-8 bg-neutral-100" />

        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          {canDelete && selectedCount > 0 && (
            <button
              onClick={openBulkDelete}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all min-h-[44px]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
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
              {bulkDeleteLabel} ({selectedCount})
            </button>
          )}
          {canCreate && (
            <Button
              variant="primary"
              size="md"
              className="flex-1 sm:flex-none min-h-[44px]"
              onClick={onCreate}
              data-tour={createDataTour}
            >
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table style={{ width: "100%" }}>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-gray-200 hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`text-xs text-black opacity-70 font-normal h-12 relative ${header.column.columnDef.meta?.className ?? ""}`}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-2 ${header.column.getCanSort() ? "cursor-pointer select-none" : ""}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-gray-400">
                                {{ asc: "↑", desc: "↓" }[
                                  header.column.getIsSorted() as string
                                ] ?? "⇅"}
                              </span>
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`resize-handle ${header.column.getIsResizing() ? "bg-teal-500 w-[5px]" : "hover:bg-gray-300 w-[5px]"}`}
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`py-3 px-4 ${cell.column.columnDef.meta?.className ?? ""}`}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteState.open}
        title={deleteTitle}
        itemName={deleteState.name ?? undefined}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deleteState.loading}
        softDelete={softDelete}
      />
      {children}
      <ConfirmDeleteModal
        isOpen={bulkDelete.open}
        title={bulkDeleteTitle(selectedCount)}
        description={bulkDeleteDescription(selectedCount)}
        onConfirm={confirmBulkDelete}
        onCancel={cancelBulkDelete}
        loading={bulkDelete.loading}
        softDelete={softDelete}
      />
    </PageContainer>
  );
}
