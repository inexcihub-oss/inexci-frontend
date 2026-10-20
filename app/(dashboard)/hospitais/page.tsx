"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { useHospitals, HOSPITALS_QUERY_KEY } from "@/hooks/useHospitals";
import { useCadastroList } from "@/hooks/useCadastroList";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
  formatCadastroAddress,
} from "@/components/shared/cadastro-table-columns";
import { NewHospitalModal } from "@/components/colaboradores/NewHospitalModal";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea, Permission } from "@/lib/permissions";

const hospitais = (n: number) => `hospita${n !== 1 ? "is" : "l"}`;

export default function HospitaisPage() {
  const router = useRouter();
  const { can, permissions } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: hospitals = [], isLoading: loading } = useHospitals();
  const list = useCadastroList({
    queryKey: HOSPITALS_QUERY_KEY,
    items: hospitals,
    service: hospitalService,
  });

  const columns: ColumnDef<Hospital>[] = [
    createNameColumn<Hospital>({
      onOpen: (h) => router.push(`/colaboradores/hospital/${h.id}`),
    }),
    createTextColumn<Hospital>({
      key: "cnpj",
      header: "CNPJ",
      size: 150,
      format: (h) => formatCNPJ(h.cnpj),
    }),
    createTextColumn<Hospital>({ key: "email", header: "E-mail", size: 200 }),
    createTextColumn<Hospital>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (h) => formatPhone(h.phone),
    }),
    createTextColumn<Hospital>({
      key: "address",
      header: "Endereço",
      size: 200,
      format: formatCadastroAddress,
    }),
  ];

  return (
    <CadastroListPage
      title="Hospitais"
      loading={loading}
      list={list}
      columns={columns}
      canCreate={hasAnyArea(permissions)}
      canDelete={can(Permission.ADMINISTRACAO)}
      createLabel="Novo hospital"
      onCreate={() => setCreateModalOpen(true)}
      deleteTitle="Excluir hospital"
      bulkDeleteTitle={(n) => `Excluir ${n} ${hospitais(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} ${hospitais(n)} selecionado${n !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`
      }
    >
      <NewHospitalModal
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
