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
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { Checkbox, SearchInput, Button } from "@/components/ui";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { useDebounce } from "@/hooks/useDebounce";
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

type TabType = "assistentes" | "hospitais" | "convenios" | "fornecedores";

type CollaboratorRole = "admin" | "editor" | "viewer";

export default function ColaboradoresPage() {
  const router = useRouter();
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

  const getRoleBadge = (role: CollaboratorRole | undefined) => {
    if (!role) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          N/A
        </span>
      );
    }
    const roleMap = {
      admin: {
        label: "Admin",
        color: "bg-purple-100 text-purple-700 border border-purple-200",
      },
      editor: {
        label: "Editor",
        color: "bg-teal-100 text-teal-700 border border-teal-200",
      },
      viewer: {
        label: "Visualizador",
        color: "bg-gray-100 text-gray-700 border border-gray-200",
      },
    };
    const roleInfo = roleMap[role];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${roleInfo.color}`}
      >
        {roleInfo.label}
      </span>
    );
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

  // Column definitions for Assistentes
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
      cell: ({ row }) => (
        <span className="text-xs text-black" title={row.original.email || "-"}>
          {row.original.email || "-"}
        </span>
      ),
    },
    {
      accessorKey: "specialty",
      header: "Especialidade",
      size: 180,
      cell: ({ row }) => (
        <span
          className="text-xs text-black"
          title={row.original.specialty || "-"}
        >
          {row.original.specialty || "-"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      size: 150,
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
      accessorKey: "role",
      header: "Permissão",
      size: 150,
      cell: ({ row }) => getRoleBadge(row.original.role),
    },
    {
      id: "actions",
      size: 50,
      enableSorting: false,
      enableResizing: false,
      header: () => <div />,
      cell: () => (
        <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
          <Image src="/icons/dots-menu.svg" alt="Menu" width={16} height={16} />
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
      cell: () => (
        <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
          <Image src="/icons/dots-menu.svg" alt="Menu" width={16} height={16} />
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
      cell: () => (
        <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
          <Image src="/icons/dots-menu.svg" alt="Menu" width={16} height={16} />
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
      cell: () => (
        <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
          <Image src="/icons/dots-menu.svg" alt="Menu" width={16} height={16} />
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
      <div className="flex-none flex items-center gap-2 px-8 py-3 border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Colaboradores
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex-none flex items-center px-8 border-b border-gray-200">
        <div className="flex items-center h-full">
          <button
            onClick={() => setActiveTab("assistentes")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "assistentes"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Assistentes
          </button>
          <button
            onClick={() => setActiveTab("hospitais")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "hospitais"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Hospitais
          </button>
          <button
            onClick={() => setActiveTab("convenios")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "convenios"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Convênios
          </button>
          <button
            onClick={() => setActiveTab("fornecedores")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "fornecedores"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Fornecedores
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex-none flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou e-mail"
            className="w-85"
          />

          {/* Divider */}
          <div className="w-px h-8 bg-neutral-100" />

          {/* Filter Button */}
          <Button variant="outline" size="md">
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

        {/* New Button */}
        <Button variant="primary" size="md">
          {activeTab === "assistentes" && "Novo assistente"}
          {activeTab === "hospitais" && "Novo hospital"}
          {activeTab === "convenios" && "Novo convênio"}
          {activeTab === "fornecedores" && "Novo fornecedor"}
        </Button>
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
                        className="text-xs text-black opacity-70 font-normal h-12 relative"
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
                        className="py-3 px-4"
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
    </PageContainer>
  );
}
