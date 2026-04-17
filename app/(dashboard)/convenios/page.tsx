"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { Checkbox, SearchInput, Button } from "@/components/ui";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { NewHealthPlanModal } from "@/components/colaboradores/NewHealthPlanModal";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ConveniosPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
    loading: boolean;
  }>({ open: false, id: null, name: null, loading: false });
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    loading: boolean;
  }>({ open: false, loading: false });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await healthPlanService.getAll();
      setHealthPlans(data);
    } catch (error) {
      console.error("Error loading health plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHealthPlans = useMemo(() => {
    if (!debouncedSearchTerm) return healthPlans;
    const search = debouncedSearchTerm.toLowerCase();
    return healthPlans.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [healthPlans, debouncedSearchTerm]);

  const selectedItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => (rowSelection as Record<string, boolean>)[key])
      .map((key) => filteredHealthPlans[parseInt(key)])
      .filter(Boolean);
  }, [rowSelection, filteredHealthPlans]);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      "bg-blue-200",
      "bg-green-200",
      "bg-yellow-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
    ];
    const index = String(id).charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, id, name, loading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await healthPlanService.delete(deleteModal.id);
      setHealthPlans((prev) => prev.filter((hp) => hp.id !== deleteModal.id));
      setDeleteModal({ open: false, id: null, name: null, loading: false });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteModal.loading)
      setDeleteModal({ open: false, id: null, name: null, loading: false });
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = selectedItems.map((item) => item.id);
    setBulkDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(ids.map((id) => healthPlanService.delete(id)));
      setHealthPlans((prev) => prev.filter((hp) => !ids.includes(hp.id)));
      setRowSelection({});
      setBulkDeleteModal({ open: false, loading: false });
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      setBulkDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns: ColumnDef<HealthPlan>[] = [
    {
      id: "select",
      size: 40,
      enableSorting: false,
      enableResizing: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          indeterminate={table.getIsSomePageRowsSelected()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Nome",
      size: 300,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() =>
            router.push(`/colaboradores/convenio/${row.original.id}`)
          }
        >
          <div
            className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(row.original.id)}`}
          >
            {getInitials(row.original.name)}
          </div>
          <span
            className="text-xs font-semibold text-black hover:text-primary-600"
            title={row.original.name}
          >
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "cnpj",
      header: "CNPJ",
      size: 150,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={formatCNPJ(row.original.cnpj)}
        >
          {formatCNPJ(row.original.cnpj)}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "E-mail",
      size: 200,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span className="text-xs text-black" title={row.original.email || "-"}>
          {row.original.email || "-"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      size: 150,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={formatPhone(row.original.phone)}
        >
          {formatPhone(row.original.phone)}
        </span>
      ),
    },
    {
      id: "actions",
      size: 50,
      enableSorting: false,
      enableResizing: false,
      header: () => <div />,
      cell: ({ row }) => (
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 active:scale-[0.95] transition-all group min-h-[44px]"
          title="Excluir convênio"
          onClick={(e) =>
            handleDeleteClick(row.original.id, row.original.name, e)
          }
        >
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
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredHealthPlans,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    enableSorting: true,
    columnResizeMode,
    enableColumnResizing: true,
  });

  return (
    <PageContainer className="border-gray-200">
      <div className="flex-none flex items-center gap-2 px-4 lg:px-8 py-3 border-b border-gray-200">
        <h1 className="ds-page-title">Convênios</h1>
      </div>

      <div className="flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou e-mail"
            className="w-full sm:w-85"
          />
          <div className="hidden sm:block w-px h-8 bg-neutral-100" />
          <Button
            variant="outline"
            size="md"
            className="hidden sm:flex min-h-[44px] rounded-xl"
          >
            <Image
              src="/icons/filter.svg"
              alt="Filtro"
              width={20}
              height={20}
              className="mr-2"
            />
            Filtro
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ open: true, loading: false })}
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
              Excluir selecionados ({selectedItems.length})
            </button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
          >
            Novo convênio
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : filteredHealthPlans.length === 0 ? (
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
        isOpen={deleteModal.open}
        title="Excluir convênio"
        itemName={deleteModal.name ?? undefined}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteModal.loading}
      />
      <NewHealthPlanModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateModalOpen(false);
        }}
      />
      <ConfirmDeleteModal
        isOpen={bulkDeleteModal.open}
        title={`Excluir ${selectedItems.length} convênio${selectedItems.length !== 1 ? "s" : ""}`}
        description={`Tem certeza que deseja excluir ${selectedItems.length} convênio${selectedItems.length !== 1 ? "s" : ""} selecionado${selectedItems.length !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => {
          if (!bulkDeleteModal.loading)
            setBulkDeleteModal({ open: false, loading: false });
        }}
        loading={bulkDeleteModal.loading}
      />
    </PageContainer>
  );
}
