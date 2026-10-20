"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { supplierService, Supplier } from "@/services/supplier.service";
import { useSuppliers, SUPPLIERS_QUERY_KEY } from "@/hooks/useSuppliers";
import { useCadastroList } from "@/hooks/useCadastroList";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
} from "@/components/shared/cadastro-table-columns";
import { NewSupplierModal } from "@/components/colaboradores/NewSupplierModal";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea, Permission } from "@/lib/permissions";

const fornecedores = (n: number) => `fornecedor${n !== 1 ? "es" : ""}`;

export default function FornecedoresPage() {
  const router = useRouter();
  const { can, permissions } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: suppliers = [], isLoading: loading } = useSuppliers();
  const list = useCadastroList({
    queryKey: SUPPLIERS_QUERY_KEY,
    items: suppliers,
    service: supplierService,
  });

  const columns: ColumnDef<Supplier>[] = [
    createNameColumn<Supplier>({
      onOpen: (s) => router.push(`/colaboradores/fornecedor/${s.id}`),
    }),
    createTextColumn<Supplier>({
      key: "cnpj",
      header: "CNPJ",
      size: 150,
      format: (s) => formatCNPJ(s.cnpj),
    }),
    createTextColumn<Supplier>({ key: "email", header: "E-mail", size: 200 }),
    createTextColumn<Supplier>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (s) => formatPhone(s.phone),
    }),
    createTextColumn<Supplier>({
      key: "address",
      header: "Endereço",
      size: 200,
    }),
  ];

  return (
    <CadastroListPage
      title="Fornecedores"
      loading={loading}
      list={list}
      columns={columns}
      canCreate={hasAnyArea(permissions)}
      canDelete={can(Permission.ADMINISTRACAO)}
      createLabel="Novo fornecedor"
      onCreate={() => setCreateModalOpen(true)}
      deleteTitle="Excluir fornecedor"
      bulkDeleteTitle={(n) => `Excluir ${n} ${fornecedores(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} ${fornecedores(n)} selecionado${n !== 1 ? "s" : ""}?`
      }
      softDelete
    >
      <NewSupplierModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          list.invalidate();
          setCreateModalOpen(false);
        }}
      />
    </CadastroListPage>
  );
}
