"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { patientService, Patient } from "@/services/patient.service";
import { Checkbox, SearchInput, Button } from "@/components/ui";
import PageContainer from "@/components/PageContainer";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { NewPatientModal } from "@/components/patients/NewPatientModal";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default function PacientesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");

  // Estados do modal de exclusão
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    patient: Patient | null;
    loading: boolean;
  }>({
    open: false,
    patient: null,
    loading: false,
  });

  // Estado do modal de exclusão em lote
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false,
  });

  // Estado do modal de novo paciente
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);

  // Debounce do termo de pesquisa para evitar requisições excessivas
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { records, total: totalCount } = await patientService.list({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debouncedSearchTerm.trim() || undefined,
      });
      setPatients(records);
      setTotal(totalCount);
    } catch (error) {
      logger.error("Erro ao carregar pacientes:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchTerm]);

  // Recarrega quando a página ou a busca (debounced) mudam.
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Volta para a primeira página sempre que o termo de busca muda.
  useEffect(() => {
    setPage(0);
    setRowSelection({});
  }, [debouncedSearchTerm]);

  const selectedPatients = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => (rowSelection as Record<string, boolean>)[key])
      .map((key) => patients[parseInt(key)])
      .filter((p): p is Patient => Boolean(p));
  }, [rowSelection, patients]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
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
    const idString = String(id);
    const index = idString.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      // Parseia a string diretamente (YYYY-MM-DD) para evitar conversão de fuso
      const [year, month, day] = dateString.substring(0, 10).split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return "-";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "-";
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  const handlePatientClick = (id: string) => {
    router.push(`/pacientes/${id}`);
  };

  const handleDeleteClick = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, patient, loading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.patient) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await patientService.delete(deleteModal.patient.id);
      setDeleteModal({ open: false, patient: null, loading: false });
      await loadPatients();
    } catch (error) {
      logger.error("Erro ao excluir paciente:", error);
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteModal.loading) {
      setDeleteModal({ open: false, patient: null, loading: false });
    }
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteModal({ open: true, loading: false });
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await patientService.deleteMany(selectedPatients.map((p) => p.id));
      setRowSelection({});
      setBulkDeleteModal({ open: false, loading: false });
      await loadPatients();
    } catch (error) {
      logger.error("Erro ao excluir pacientes:", error);
      setBulkDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleBulkDeleteCancel = () => {
    if (!bulkDeleteModal.loading) {
      setBulkDeleteModal({ open: false, loading: false });
    }
  };

  // Definição das colunas
  const columns: ColumnDef<Patient>[] = [
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
      enableResizing: false,
    },
    {
      accessorKey: "name",
      header: "Nome",
      size: 250,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() => handlePatientClick(row.original.id)}
        >
          <div
            className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
              row.original.id,
            )}`}
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
      accessorKey: "cpf",
      header: "CPF",
      size: 150,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={formatCPF(row.original.cpf)}
        >
          {formatCPF(row.original.cpf)}
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
      accessorKey: "birthDate",
      header: "Data de Nascimento",
      size: 150,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={formatDate(row.original.birthDate)}
        >
          {formatDate(row.original.birthDate)}
        </span>
      ),
    },
    {
      id: "actions",
      size: 50,
      header: "",
      cell: ({ row }) => (
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors group"
          title="Excluir paciente"
          onClick={(e) => handleDeleteClick(row.original, e)}
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
      enableResizing: false,
    },
  ];

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    enableSorting: true,
    columnResizeMode,
    enableColumnResizing: true,
  });

  return (
    <PageContainer className="border-gray-200">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 lg:px-8 py-3.5 border-b border-gray-200">
        <h1 className="ds-page-title">Pacientes</h1>
      </div>

      {/* Search and Actions */}
      <div className="flex-none flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-gray-200">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, e-mail ou CPF"
          className="w-full sm:flex-1 lg:w-85 lg:flex-none"
        />

        <div className="hidden sm:block w-px h-8 bg-neutral-100" />

        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          {selectedPatients.length > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors min-h-[44px]"
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
              Excluir selecionados ({selectedPatients.length})
            </button>
          )}
          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-none min-h-[44px]"
            onClick={() => setNewPatientModalOpen(true)}
          >
            Novo paciente
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum paciente encontrado</p>
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
                        style={{
                          width: header.getSize(),
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-2 ${
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-gray-400">
                                {{
                                  asc: "↑",
                                  desc: "↓",
                                }[header.column.getIsSorted() as string] ?? "⇅"}
                              </span>
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`resize-handle ${
                              header.column.getIsResizing()
                                ? "bg-teal-500 w-[5px]"
                                : "hover:bg-gray-300 w-[5px]"
                            }`}
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
                        style={{
                          width: cell.column.getSize(),
                        }}
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

        {/* Paginação server-side */}
        {!loading && total > 0 && (
          <div className="flex-none flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Mostrando {rangeStart}–{rangeEnd} de {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
      <NewPatientModal
        isOpen={newPatientModalOpen}
        onClose={() => setNewPatientModalOpen(false)}
        onSuccess={() => {
          loadPatients();
          setNewPatientModalOpen(false);
        }}
      />
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        title="Excluir paciente"
        itemName={deleteModal.patient?.name}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteModal.loading}
      />
      <ConfirmDeleteModal
        isOpen={bulkDeleteModal.open}
        title={`Excluir ${selectedPatients.length} paciente${selectedPatients.length !== 1 ? "s" : ""}`}
        description={`Tem certeza que deseja excluir ${selectedPatients.length} paciente${selectedPatients.length !== 1 ? "s" : ""} selecionado${selectedPatients.length !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        loading={bulkDeleteModal.loading}
      />
    </PageContainer>
  );
}
