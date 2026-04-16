"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import PageContainer from "@/components/PageContainer";
import { SearchInput, Button, Checkbox } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { useDebounce } from "@/hooks";
import { ProcedureSideSheet } from "@/components/procedures/ProcedureSideSheet";
import { NewProcedureModelModal } from "@/components/procedures/NewProcedureModelModal";
import { ProcedureModel } from "@/components/procedures/types";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

/** Converte um template da API para o tipo ProcedureModel usado na UI */
function templateToModel(t: any): ProcedureModel {
  const data = t.template_data || {};
  return {
    id: t.id,
    modelName: t.name,
    procedureName: data.procedures?.[0]?.name || data.procedure_name || "—",
    createdAt: t.created_at
      ? new Date(t.created_at).toLocaleDateString("pt-BR")
      : "—",
    createdBy: t.doctor?.name || "Você",
    usageCount: t.usage_count ?? 0,
    documents: (data.required_documents || []).map((d: any, i: number) => ({
      id: String(i),
      type: d.type || d,
      name: d.name || d.type || d,
    })),
    opmeItems: (data.opme_items || []).map((o: any, i: number) => ({
      id: String(i),
      name: o.name,
      quantity: o.quantity || 1,
      manufacturers: o.manufacturers || (o.brand ? [o.brand] : []),
      suppliers: o.suppliers || (o.distributor ? [o.distributor] : []),
    })),
    tussItems: (data.procedures || []).map((p: any, i: number) => ({
      id: String(i),
      code: p.tuss_code || "",
      name: p.name || "",
      quantity: p.quantity || 1,
    })),
    // Guarda o template_data completo para reuso
    _raw: t,
  } as ProcedureModel & { _raw: any };
}

export default function ProcedimentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [procedures, setProcedures] = useState<ProcedureModel[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureModel | null>(null);
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false);
  const [isNewModelModalOpen, setIsNewModelModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const { showToast } = useToast();

  // Modal de exclusão individual
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    procedure: ProcedureModel | null;
    loading: boolean;
  }>({ open: false, procedure: null, loading: false });

  // Modal de exclusão em lote
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    loading: boolean;
  }>({ open: false, loading: false });

  // ─── Carrega templates da API ─────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await surgeryRequestService.getTemplates();
      setProcedures(Array.isArray(data) ? data.map(templateToModel) : []);
    } catch {
      showToast("Erro ao carregar modelos", "error");
    } finally {
      setIsLoadingList(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filtrar procedimentos baseado na busca
  const filteredProcedures = useMemo(() => {
    if (!debouncedSearchTerm) return procedures;
    const search = debouncedSearchTerm.toLowerCase();
    return procedures.filter(
      (proc) =>
        proc.modelName.toLowerCase().includes(search) ||
        proc.procedureName.toLowerCase().includes(search) ||
        proc.createdBy.toLowerCase().includes(search),
    );
  }, [debouncedSearchTerm, procedures]);

  const selectedItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => (rowSelection as Record<string, boolean>)[key])
      .map((key) => filteredProcedures[parseInt(key)])
      .filter((p): p is ProcedureModel => Boolean(p));
  }, [rowSelection, filteredProcedures]);

  // ─── Handlers exclusão individual ────────────────────────────────────────────
  const handleDeleteClick = (
    procedure: ProcedureModel,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setDeleteModal({ open: true, procedure, loading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.procedure) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await surgeryRequestService.deleteTemplate(deleteModal.procedure.id);
      showToast("Modelo excluído com sucesso", "success");
      setProcedures((prev) =>
        prev.filter((p) => p.id !== deleteModal.procedure!.id),
      );
      setDeleteModal({ open: false, procedure: null, loading: false });
    } catch {
      showToast("Erro ao excluir modelo", "error");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteModal.loading) {
      setDeleteModal({ open: false, procedure: null, loading: false });
    }
  };

  // ─── Handlers exclusão em lote ───────────────────────────────────────────────
  const handleBulkDeleteClick = () => {
    setBulkDeleteModal({ open: true, loading: false });
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(
        selectedItems.map((p) => surgeryRequestService.deleteTemplate(p.id)),
      );
      showToast(
        `${selectedItems.length} modelo(s) excluído(s) com sucesso`,
        "success",
      );
      setProcedures((prev) =>
        prev.filter((p) => !selectedItems.some((s) => s.id === p.id)),
      );
      setRowSelection({});
      setBulkDeleteModal({ open: false, loading: false });
    } catch {
      showToast("Erro ao excluir modelos", "error");
      setBulkDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleBulkDeleteCancel = () => {
    if (!bulkDeleteModal.loading) {
      setBulkDeleteModal({ open: false, loading: false });
    }
  };

  const columns = useMemo<ColumnDef<ProcedureModel>[]>(
    () => [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            indeterminate={table.getIsSomeRowsSelected()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
      },
      {
        id: "modelName",
        accessorKey: "modelName",
        header: "Nome do modelo",
        size: 240,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-black truncate block">
            {row.original.modelName}
          </span>
        ),
      },
      {
        id: "procedureName",
        accessorKey: "procedureName",
        header: "Procedimento",
        size: 240,
        cell: ({ row }) => (
          <span className="text-xs text-black truncate block">
            {row.original.procedureName}
          </span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Criado em",
        size: 120,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <span className="text-xs text-black">{row.original.createdAt}</span>
        ),
      },
      {
        id: "createdBy",
        accessorKey: "createdBy",
        header: "Criado por",
        size: 200,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <span className="text-xs text-black truncate block">
            {row.original.createdBy}
          </span>
        ),
      },
      {
        id: "usageCount",
        accessorKey: "usageCount",
        header: "Usos",
        size: 80,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <span className="text-xs text-black">{row.original.usageCount}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={(e) => handleDeleteClick(row.original, e)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 transition-colors group"
            title="Excluir modelo"
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
    ],
    [],
  );

  const table = useReactTable({
    data: filteredProcedures,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const handleRowClick = (procedure: ProcedureModel) => {
    setSelectedProcedure(procedure);
    setIsSideSheetOpen(true);
  };

  const handleCloseSideSheet = () => {
    setIsSideSheetOpen(false);
    setSelectedProcedure(null);
  };

  const handleNewModelSubmit = async (data: {
    modelName: string;
    procedureName: string;
  }) => {
    try {
      const created = await surgeryRequestService.createTemplate({
        name: data.modelName,
        template_data: {
          procedure_name: data.procedureName,
        },
      });
      setProcedures((prev) => [templateToModel(created), ...prev]);
      showToast("Modelo criado com sucesso!", "success");
    } catch {
      showToast("Erro ao criar modelo", "error");
    }
    setIsNewModelModalOpen(false);
  };

  return (
    <PageContainer className="border-gray-200">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 lg:px-8 py-3 border-b border-gray-200">
        <h1 className="text-2xl lg:text-3xl font-semibold text-black font-urbanist">
          Procedimentos
        </h1>
      </div>

      {/* Search + Button Bar */}
      <div className="flex-none flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Nome do procedimento"
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
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
            onClick={() => setIsNewModelModalOpen(true)}
          >
            Novo modelo
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoadingList ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
          </div>
        ) : filteredProcedures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <p className="text-gray-500 text-sm">
              {debouncedSearchTerm
                ? "Nenhum modelo encontrado para a busca"
                : "Você ainda não tem modelos salvos"}
            </p>
            {!debouncedSearchTerm && (
              <p className="text-gray-400 text-xs">
                Salve uma solicitação como modelo ao enviá-la, ou clique em
                &ldquo;Novo modelo&rdquo;
              </p>
            )}
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
                        className={`text-xs text-black opacity-70 font-normal h-12 ${header.column.columnDef.meta?.className ?? ""}`}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
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
                    onClick={() => handleRowClick(row.original)}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`py-3 px-4 ${cell.column.columnDef.meta?.className ?? ""}`}
                        style={{ width: cell.column.getSize() }}
                        onClick={
                          cell.column.id === "select" ||
                          cell.column.id === "actions"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
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

      {/* Side Sheet */}
      <ProcedureSideSheet
        isOpen={isSideSheetOpen}
        onClose={handleCloseSideSheet}
        procedure={selectedProcedure}
      />

      {/* New Model Modal */}
      <NewProcedureModelModal
        isOpen={isNewModelModalOpen}
        onClose={() => setIsNewModelModalOpen(false)}
        onSubmit={handleNewModelSubmit}
      />

      {/* Modal exclusão individual */}
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        title="Excluir modelo"
        itemName={deleteModal.procedure?.modelName ?? undefined}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteModal.loading}
      />

      {/* Modal exclusão em lote */}
      <ConfirmDeleteModal
        isOpen={bulkDeleteModal.open}
        title={`Excluir ${selectedItems.length} modelo${selectedItems.length !== 1 ? "s" : ""}`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        loading={bulkDeleteModal.loading}
      />
    </PageContainer>
  );
}
