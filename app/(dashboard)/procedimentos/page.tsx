"use client";

import { useState, useMemo } from "react";
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

// Mock data baseado no Figma
const mockProcedures: ProcedureModel[] = [
  {
    id: "1",
    modelName: "Artroplastia padrão Unimed",
    procedureName: "Artroplastia total de quadril",
    createdAt: "15/10/2025",
    createdBy: "Dr. Carlos Almeida",
    usageCount: 12,
  },
  {
    id: "2",
    modelName: "Artroplastia padrão Amil",
    procedureName: "Artroplastia parcial de joelho",
    createdAt: "22/11/2025",
    createdBy: "Dr. Ana Sousa",
    usageCount: 8,
  },
  {
    id: "3",
    modelName: "Artroplastia padrão Bradesco",
    procedureName: "Artroplastia total de joelho",
    createdAt: "05/12/2025",
    createdBy: "Dr. Marcos Silva",
    usageCount: 10,
  },
  {
    id: "4",
    modelName: "Artroplastia padrão SulAmérica",
    procedureName: "Artroplastia de ombro",
    createdAt: "18/01/2026",
    createdBy: "Dr. Fernanda Lima",
    usageCount: 7,
  },
  {
    id: "5",
    modelName: "Artroplastia padrão Itausa",
    procedureName: "Substituição total de quadril",
    createdAt: "30/01/2026",
    createdBy: "Dr. Roberto Dias",
    usageCount: 15,
  },
  {
    id: "6",
    modelName: "Artroplastia padrão Allianz",
    procedureName: "Revisão de artroplastia de joelho",
    createdAt: "12/02/2026",
    createdBy: "Dr. Patricia Gomes",
    usageCount: 5,
  },
  {
    id: "7",
    modelName: "Artroplastia padrão Porto Seguro",
    procedureName: "Artroplastia de tornozelo",
    createdAt: "25/03/2026",
    createdBy: "Dr. Leonardo Costa",
    usageCount: 6,
  },
  {
    id: "8",
    modelName: "Artroplastia padrão Cassi",
    procedureName: "Artroplastia de quadril com enxerto",
    createdAt: "10/04/2026",
    createdBy: "Dr. Juliana Freitas",
    usageCount: 9,
  },
];

export default function ProcedimentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureModel | null>(null);
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false);
  const [isNewModelModalOpen, setIsNewModelModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

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

  // Filtrar procedimentos baseado na busca
  const filteredProcedures = useMemo(() => {
    if (!debouncedSearchTerm) return mockProcedures;
    const search = debouncedSearchTerm.toLowerCase();
    return mockProcedures.filter(
      (proc) =>
        proc.modelName.toLowerCase().includes(search) ||
        proc.procedureName.toLowerCase().includes(search) ||
        proc.createdBy.toLowerCase().includes(search),
    );
  }, [debouncedSearchTerm]);

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
    // TODO: Implementar exclusão via API
    setDeleteModal({ open: false, procedure: null, loading: false });
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
    // TODO: Implementar exclusão em lote via API
    setRowSelection({});
    setBulkDeleteModal({ open: false, loading: false });
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

  const handleNewModelSubmit = (data: {
    modelName: string;
    procedureName: string;
  }) => {
    // TODO: Implementar criação do modelo via API
    console.log("Novo modelo:", data);
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
        {filteredProcedures.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum procedimento encontrado</p>
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
                        className={`text-xs text-black opacity-70 font-normal h-12 ${(header.column.columnDef.meta as any)?.className ?? ""}`}
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
                        className={`py-3 px-4 ${(cell.column.columnDef.meta as any)?.className ?? ""}`}
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

// Filtrar procedimentos baseado na busca
