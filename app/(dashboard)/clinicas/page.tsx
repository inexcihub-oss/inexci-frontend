"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { clinicService, Clinic } from "@/services/clinic.service";
import { useClinics, CLINICS_QUERY_KEY } from "@/hooks/useClinics";
import { useCadastroList } from "@/hooks/useCadastroList";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
  formatCadastroAddress,
} from "@/components/shared/cadastro-table-columns";
import { NewClinicModal } from "@/components/clinics/NewClinicModal";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

const plural = (n: number) => (n !== 1 ? "s" : "");

export default function ClinicasPage() {
  const router = useRouter();
  const { can } = useAuth();
  const podeAdministrar = can(Permission.ADMINISTRACAO);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: clinics = [], isLoading: loading } = useClinics();
  const list = useCadastroList({
    queryKey: CLINICS_QUERY_KEY,
    items: clinics,
    service: clinicService,
  });

  const columns: ColumnDef<Clinic>[] = [
    createNameColumn<Clinic>({
      onOpen: (c) => router.push(`/clinicas/${c.id}`),
    }),
    createTextColumn<Clinic>({
      key: "cnpj",
      header: "CNPJ",
      size: 150,
      format: (c) => formatCNPJ(c.cnpj),
    }),
    createTextColumn<Clinic>({ key: "email", header: "E-mail", size: 200 }),
    createTextColumn<Clinic>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (c) => formatPhone(c.phone),
    }),
    createTextColumn<Clinic>({
      key: "address",
      header: "Endereço",
      size: 200,
      format: formatCadastroAddress,
    }),
  ];

  return (
    <CadastroListPage
      title="Clínicas"
      loading={loading}
      list={list}
      columns={columns}
      canCreate={podeAdministrar}
      canDelete={podeAdministrar}
      createLabel="Nova clínica"
      createDataTour="cadastros-clinicas"
      onCreate={() => setCreateModalOpen(true)}
      bulkDeleteLabel="Excluir selecionadas"
      deleteTitle="Excluir clínica"
      bulkDeleteTitle={(n) => `Excluir ${n} clínica${plural(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} clínica${plural(n)} selecionada${plural(n)}? Esta ação não pode ser desfeita.`
      }
    >
      <NewClinicModal
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
