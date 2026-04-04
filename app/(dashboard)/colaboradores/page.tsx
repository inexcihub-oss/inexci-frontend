"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  collaboratorService,
  Collaborator,
} from "@/services/collaborator.service";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { supplierService, Supplier } from "@/services/supplier.service";
import { useAuth } from "@/contexts/AuthContext";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { Checkbox, SearchInput, Button } from "@/components/ui";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { NewCollaboratorModal } from "@/components/colaboradores/NewCollaboratorModal";

import { NewHospitalModal } from "@/components/colaboradores/NewHospitalModal";
import { NewHealthPlanModal } from "@/components/colaboradores/NewHealthPlanModal";
import { NewSupplierModal } from "@/components/colaboradores/NewSupplierModal";
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

type TabType =
  | "assistentes"
  | "hospitais"
  | "convenios"
  | "fornecedores";

export default function ColaboradoresPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("assistentes");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Data states
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Table states
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");

  // Estado do modal de exclusão (genérico para todas as abas)
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
    loading: boolean;
    tabType: TabType | null;
  }>({
    open: false,
    id: null,
    name: null,
    loading: false,
    tabType: null,
  });

  // Estado do modal de exclusão em lote
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false,
  });

  // Estado do modal de criação
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Debounce do termo de pesquisa para evitar re-renderizações excessivas
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load data based on active tab
  useEffect(() => {
    loadData();
    setRowSelection({}); // Clear selection when changing tabs
    setSorting([]); // Clear sorting when changing tabs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "assistentes":
          const collabData = await collaboratorService.getAll();
          setCollaborators(collabData);
          break;
        case "hospitais":
          const hospitalData = await hospitalService.getAll();
          setHospitals(hospitalData);
          break;
        case "convenios":
          const healthPlanData = await healthPlanService.getAll();
          setHealthPlans(healthPlanData);
          break;
        case "fornecedores":
          const supplierData = await supplierService.getAll();
          setSuppliers(supplierData);
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Memoiza os dados filtrados baseado na tab ativa e termo de pesquisa
  const filteredCollaborators = useMemo(() => {
    if (!debouncedSearchTerm) return collaborators;
    const search = debouncedSearchTerm.toLowerCase();
    return collaborators.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [collaborators, debouncedSearchTerm]);

  const filteredHospitals = useMemo(() => {
    if (!debouncedSearchTerm) return hospitals;
    const search = debouncedSearchTerm.toLowerCase();
    return hospitals.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [hospitals, debouncedSearchTerm]);

  const filteredHealthPlans = useMemo(() => {
    if (!debouncedSearchTerm) return healthPlans;
    const search = debouncedSearchTerm.toLowerCase();
    return healthPlans.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [healthPlans, debouncedSearchTerm]);

  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearchTerm) return suppliers;
    const search = debouncedSearchTerm.toLowerCase();
    return suppliers.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [suppliers, debouncedSearchTerm]);

  // Retorna os dados filtrados da tab atual para verificações de estado
  const getCurrentFilteredData = () => {
    switch (activeTab) {
      case "assistentes":
        return filteredCollaborators;
      case "hospitais":
        return filteredHospitals;
      case "convenios":
        return filteredHealthPlans;
      case "fornecedores":
        return filteredSuppliers;
      default:
        return [];
    }
  };

  const selectedItems = useMemo(() => {
    const currentData = (() => {
      switch (activeTab) {
        case "assistentes":
          return filteredCollaborators;
        case "hospitais":
          return filteredHospitals;
        case "convenios":
          return filteredHealthPlans;
        case "fornecedores":
          return filteredSuppliers;
        default:
          return [];
      }
    })();
    return Object.keys(rowSelection)
      .filter((key) => (rowSelection as Record<string, boolean>)[key])
      .map((key) => currentData[parseInt(key)])
      .filter((item): item is (typeof currentData)[number] => Boolean(item));
  }, [
    rowSelection,
    activeTab,
    filteredCollaborators,
    filteredHospitals,
    filteredHealthPlans,
    filteredSuppliers,
  ]);

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

  const handleRowClick = (id: string, type: TabType) => {
    switch (type) {
      case "assistentes":
        router.push(`/colaboradores/assistente/${id}`);
        break;
      case "hospitais":
        router.push(`/colaboradores/hospital/${id}`);
        break;
      case "convenios":
        router.push(`/colaboradores/convenio/${id}`);
        break;
      case "fornecedores":
        router.push(`/colaboradores/fornecedor/${id}`);
        break;
    }
  };

  const handleDeleteClick = (
    id: string,
    name: string,
    tabType: TabType,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setDeleteModal({ open: true, id, name, loading: false, tabType });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id || !deleteModal.tabType) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      switch (deleteModal.tabType) {
        case "assistentes":
          await collaboratorService.delete(deleteModal.id);
          setCollaborators((prev) =>
            prev.filter((c) => c.id !== deleteModal.id),
          );
          break;
        case "hospitais":
          await hospitalService.delete(deleteModal.id);
          setHospitals((prev) => prev.filter((h) => h.id !== deleteModal.id));
          break;
        case "convenios":
          await healthPlanService.delete(deleteModal.id);
          setHealthPlans((prev) =>
            prev.filter((hp) => hp.id !== deleteModal.id),
          );
          break;
        case "fornecedores":
          await supplierService.delete(deleteModal.id);
          setSuppliers((prev) => prev.filter((s) => s.id !== deleteModal.id));
          break;
      }
      setDeleteModal({
        open: false,
        id: null,
        name: null,
        loading: false,
        tabType: null,
      });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteModal.loading) {
      setDeleteModal({
        open: false,
        id: null,
        name: null,
        loading: false,
        tabType: null,
      });
    }
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteModal({ open: true, loading: false });
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = selectedItems.map((item) => item.id);
    setBulkDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      switch (activeTab) {
        case "assistentes":
          await Promise.all(ids.map((id) => collaboratorService.delete(id)));
          setCollaborators((prev) => prev.filter((c) => !ids.includes(c.id)));
          break;
        case "hospitais":
          await Promise.all(ids.map((id) => hospitalService.delete(id)));
          setHospitals((prev) => prev.filter((h) => !ids.includes(h.id)));
          break;
        case "convenios":
          await Promise.all(ids.map((id) => healthPlanService.delete(id)));
          setHealthPlans((prev) => prev.filter((hp) => !ids.includes(hp.id)));
          break;
        case "fornecedores":
          await Promise.all(ids.map((id) => supplierService.delete(id)));
          setSuppliers((prev) => prev.filter((s) => !ids.includes(s.id)));
          break;
      }
      setRowSelection({});
      setBulkDeleteModal({ open: false, loading: false });
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      setBulkDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleBulkDeleteCancel = () => {
    if (!bulkDeleteModal.loading) {
      setBulkDeleteModal({ open: false, loading: false });
    }
  };

  // Column definitions for Colaboradores
  const collaboratorColumns: ColumnDef<Collaborator>[] = [
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
      size: 250,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() => handleRowClick(row.original.id, "assistentes")}
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
      id: "type",
      header: "Tipo",
      size: 120,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) =>
        row.original.is_doctor ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            Médico
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Colaborador
          </span>
        ),
    },
    {
      accessorKey: "crm",
      header: "CRM",
      size: 120,
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <span className="text-xs text-black">
          {row.original.is_doctor && row.original.crm
            ? `${row.original.crm}/${row.original.crmState || ""}`
            : "-"}
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
          title="Excluir colaborador"
          onClick={(e) =>
            handleDeleteClick(
              row.original.id,
              row.original.name,
              "assistentes",
              e,
            )
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

  // Column definitions for Hospitais
  const hospitalColumns: ColumnDef<Hospital>[] = [
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
      size: 250,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() => handleRowClick(row.original.id, "hospitais")}
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
      accessorKey: "address",
      header: "Endereço",
      size: 200,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => {
        const h = row.original;
        const parts = [
          h.address,
          h.city && h.state ? `${h.city}/${h.state}` : h.city || h.state,
        ].filter(Boolean);
        const display = parts.length > 0 ? parts.join(" — ") : "-";
        return (
          <span className="text-xs text-black" title={display}>
            {display}
          </span>
        );
      },
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
          title="Excluir hospital"
          onClick={(e) =>
            handleDeleteClick(
              row.original.id,
              row.original.name,
              "hospitais",
              e,
            )
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

  // Column definitions for Convênios
  const healthPlanColumns: ColumnDef<HealthPlan>[] = [
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
          onClick={() => handleRowClick(row.original.id, "convenios")}
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
            handleDeleteClick(
              row.original.id,
              row.original.name,
              "convenios",
              e,
            )
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

  // Column definitions for Fornecedores
  const supplierColumns: ColumnDef<Supplier>[] = [
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
      size: 250,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={() => handleRowClick(row.original.id, "fornecedores")}
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
      accessorKey: "address",
      header: "Endereço",
      size: 200,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={row.original.address || "-"}
        >
          {row.original.address || "-"}
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
          title="Excluir fornecedor"
          onClick={(e) =>
            handleDeleteClick(
              row.original.id,
              row.original.name,
              "fornecedores",
              e,
            )
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

  // Create tables - Usando dados memoizados para cada tipo
  const collaboratorTable = useReactTable({
    data: filteredCollaborators,
    columns: collaboratorColumns,
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


  const hospitalTable = useReactTable({
    data: filteredHospitals,
    columns: hospitalColumns,
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

  const healthPlanTable = useReactTable({
    data: filteredHealthPlans,
    columns: healthPlanColumns,
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

  const supplierTable = useReactTable({
    data: filteredSuppliers,
    columns: supplierColumns,
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

  const getCurrentTable = () => {
    switch (activeTab) {
      case "assistentes":
        return collaboratorTable;
      case "hospitais":
        return hospitalTable;
      case "convenios":
        return healthPlanTable;
      case "fornecedores":
        return supplierTable;
      default:
        return collaboratorTable;
    }
  };

  const table = getCurrentTable();

  return (
    <PageContainer className="border-gray-200">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 lg:px-8 py-3 border-b border-gray-200">
        <h1 className="ds-page-title">Colaboradores</h1>
      </div>

      {/* Tabs */}
      <div className="flex-none flex items-center px-4 lg:px-8 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <div className="flex items-center h-full whitespace-nowrap">
          <button
            onClick={() => setActiveTab("assistentes")}
            className={`px-4 py-3 text-sm transition-all min-h-[44px] -mb-px ${
              activeTab === "assistentes"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-gray-500 hover:text-black"
            }`}
          >
            Colaboradores
          </button>
          <button
            onClick={() => setActiveTab("hospitais")}
            className={`px-4 py-3 text-sm transition-all min-h-[44px] -mb-px ${
              activeTab === "hospitais"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-gray-500 hover:text-black"
            }`}
          >
            Hospitais
          </button>
          <button
            onClick={() => setActiveTab("convenios")}
            className={`px-4 py-3 text-sm transition-all min-h-[44px] -mb-px ${
              activeTab === "convenios"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-gray-500 hover:text-black"
            }`}
          >
            Convênios
          </button>
          <button
            onClick={() => setActiveTab("fornecedores")}
            className={`px-4 py-3 text-sm transition-all min-h-[44px] -mb-px ${
              activeTab === "fornecedores"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-gray-500 hover:text-black"
            }`}
          >
            Fornecedores
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou e-mail"
            className="w-full sm:w-85"
          />

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-neutral-100" />

          {/* Filter Button */}
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

        {/* Bulk delete + New Button */}
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={handleBulkDeleteClick}
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
            {activeTab === "assistentes" && "Novo colaborador"}
            {activeTab === "hospitais" && "Novo hospital"}
            {activeTab === "convenios" && "Novo convênio"}
            {activeTab === "fornecedores" && "Novo fornecedor"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : getCurrentFilteredData().length === 0 ? (
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
                        className={`text-xs text-black opacity-70 font-normal h-12 relative ${(header.column.columnDef.meta as any)?.className ?? ""}`}
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
                        className={`py-3 px-4 ${(cell.column.columnDef.meta as any)?.className ?? ""}`}
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
      </div>
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        title={
          deleteModal.tabType === "assistentes"
            ? "Excluir colaborador"
            : deleteModal.tabType === "hospitais"
              ? "Excluir hospital"
              : deleteModal.tabType === "convenios"
                ? "Excluir convênio"
                : "Excluir fornecedor"
        }
        itemName={deleteModal.name ?? undefined}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteModal.loading}
      />
      {/* Modais de criação */}
      <NewCollaboratorModal
        isOpen={createModalOpen && activeTab === "assistentes"}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateModalOpen(false);
        }}
      />
      <NewHospitalModal
        isOpen={createModalOpen && activeTab === "hospitais"}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateModalOpen(false);
        }}
      />
      <NewHealthPlanModal
        isOpen={createModalOpen && activeTab === "convenios"}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateModalOpen(false);
        }}
      />
      <NewSupplierModal
        isOpen={createModalOpen && activeTab === "fornecedores"}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateModalOpen(false);
        }}
      />
      <ConfirmDeleteModal
        isOpen={bulkDeleteModal.open}
        title={`Excluir ${selectedItems.length} ${
          activeTab === "assistentes"
            ? "colaborador"
            : activeTab === "hospitais"
              ? "hospital"
              : activeTab === "convenios"
                ? "convênio"
                : "fornecedor"
        }${selectedItems.length !== 1 ? "es" : ""}`}
        description={`Tem certeza que deseja excluir ${selectedItems.length} ${
          activeTab === "assistentes"
            ? "colaborador"
            : activeTab === "hospitais"
              ? "hospital"
              : activeTab === "convenios"
                ? "convênio"
                : "fornecedor"
        }${selectedItems.length !== 1 ? "es" : ""} selecionado${selectedItems.length !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        loading={bulkDeleteModal.loading}
      />
    </PageContainer>
  );
}
