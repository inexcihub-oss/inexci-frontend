"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  collaboratorService,
  Collaborator,
} from "@/services/collaborator.service";
import { formatPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { registryKeys } from "@/lib/query-keys";
import { councilOf, professionalKindLabel } from "@/lib/professional-council";
import { useCadastroList } from "@/hooks/useCadastroList";
import { useInvalidateAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
} from "@/components/shared/cadastro-table-columns";
import { NewCollaboratorModal } from "@/components/colaboradores/NewCollaboratorModal";
import { useOnboardingAction } from "@/components/onboarding/useOnboardingAction";

const COLLABORATORS_QUERY_KEY = registryKeys.collaborators();
const colaboradores = (n: number) => `colaborador${n !== 1 ? "es" : ""}`;

export default function ColaboradoresPage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const invalidateAvailableDoctors = useInvalidateAvailableDoctors();

  useOnboardingAction("administracao-abrir-novo-colaborador", () =>
    setCreateModalOpen(true),
  );

  const { data: collaborators = [], isLoading: loading } = useQuery({
    queryKey: COLLABORATORS_QUERY_KEY,
    queryFn: () => collaboratorService.getAll(),
  });
  const list = useCadastroList({
    queryKey: COLLABORATORS_QUERY_KEY,
    items: collaborators,
    service: collaboratorService,
    onDeleted: () => void invalidateAvailableDoctors(),
  });

  const columns: ColumnDef<Collaborator>[] = [
    createNameColumn<Collaborator>({
      onOpen: (c) => router.push(`/colaboradores/assistente/${c.id}`),
      getAvatarUrl: (c) => c.avatarUrl,
    }),
    createTextColumn<Collaborator>({
      key: "email",
      header: "E-mail",
      size: 200,
    }),
    createTextColumn<Collaborator>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (c) => formatPhone(c.phone),
    }),
    {
      id: "type",
      header: "Tipo",
      size: 120,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) =>
        row.original.isDoctor ? (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border",
              councilOf(row.original.doctorProfile) === "CRM"
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-teal-50 text-teal-800 border-teal-200",
            )}
          >
            {professionalKindLabel(row.original.doctorProfile)}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Colaborador
          </span>
        ),
    },
  ];

  return (
    <CadastroListPage
      title="Colaboradores"
      loading={loading}
      list={list}
      columns={columns}
      canCreate
      canDelete
      createLabel="Novo colaborador"
      createDataTour="admin-novo-colaborador"
      onCreate={() => setCreateModalOpen(true)}
      deleteTitle="Excluir colaborador"
      bulkDeleteTitle={(n) => `Excluir ${n} ${colaboradores(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} ${colaboradores(n)} selecionado${n !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`
      }
    >
      <NewCollaboratorModal
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
