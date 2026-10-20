"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  manufacturerService,
  Manufacturer,
} from "@/services/manufacturer.service";
import {
  useManufacturers,
  MANUFACTURERS_QUERY_KEY,
} from "@/hooks/useManufacturers";
import { useCadastroList } from "@/hooks/useCadastroList";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
} from "@/components/shared/cadastro-table-columns";
import { NewManufacturerModal } from "@/components/colaboradores/NewManufacturerModal";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea, Permission } from "@/lib/permissions";

const plural = (n: number) => (n !== 1 ? "s" : "");

export default function FabricantesPage() {
  const router = useRouter();
  const { can, permissions } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: manufacturers = [], isLoading: loading } = useManufacturers();
  const list = useCadastroList({
    queryKey: MANUFACTURERS_QUERY_KEY,
    items: manufacturers,
    service: manufacturerService,
  });

  const columns: ColumnDef<Manufacturer>[] = [
    createNameColumn<Manufacturer>({
      onOpen: (m) => router.push(`/colaboradores/fabricante/${m.id}`),
    }),
    createTextColumn<Manufacturer>({
      key: "cnpj",
      header: "CNPJ",
      size: 150,
      format: (m) => formatCNPJ(m.cnpj),
    }),
    createTextColumn<Manufacturer>({
      key: "anvisaRegistration",
      header: "Registro ANVISA",
      size: 170,
    }),
    createTextColumn<Manufacturer>({
      key: "email",
      header: "E-mail",
      size: 200,
    }),
    createTextColumn<Manufacturer>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (m) => formatPhone(m.phone),
    }),
    createTextColumn<Manufacturer>({
      key: "country",
      header: "País",
      size: 130,
      hiddenBelow: "lg",
    }),
  ];

  return (
    <CadastroListPage
      title="Fabricantes"
      loading={loading}
      list={list}
      columns={columns}
      canCreate={hasAnyArea(permissions)}
      canDelete={can(Permission.ADMINISTRACAO)}
      createLabel="Novo fabricante"
      onCreate={() => setCreateModalOpen(true)}
      deleteTitle="Excluir fabricante"
      bulkDeleteTitle={(n) => `Excluir ${n} fabricante${plural(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} fabricante${plural(n)} selecionado${plural(n)}?`
      }
      softDelete
    >
      <NewManufacturerModal
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
