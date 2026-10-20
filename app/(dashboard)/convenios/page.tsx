"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import {
  useHealthPlans,
  HEALTH_PLANS_QUERY_KEY,
} from "@/hooks/useHealthPlans";
import { useCadastroList } from "@/hooks/useCadastroList";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { CadastroListPage } from "@/components/shared/CadastroListPage";
import {
  createNameColumn,
  createTextColumn,
} from "@/components/shared/cadastro-table-columns";
import { NewHealthPlanModal } from "@/components/colaboradores/NewHealthPlanModal";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea, Permission } from "@/lib/permissions";

const plural = (n: number) => (n !== 1 ? "s" : "");

export default function ConveniosPage() {
  const router = useRouter();
  const { can, permissions } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: healthPlans = [], isLoading: loading } = useHealthPlans();
  const list = useCadastroList({
    queryKey: HEALTH_PLANS_QUERY_KEY,
    items: healthPlans,
    service: healthPlanService,
  });

  const columns: ColumnDef<HealthPlan>[] = [
    createNameColumn<HealthPlan>({
      onOpen: (hp) => router.push(`/colaboradores/convenio/${hp.id}`),
      size: 300,
    }),
    createTextColumn<HealthPlan>({
      key: "cnpj",
      header: "CNPJ",
      size: 150,
      format: (hp) => formatCNPJ(hp.cnpj),
    }),
    createTextColumn<HealthPlan>({ key: "email", header: "E-mail", size: 200 }),
    createTextColumn<HealthPlan>({
      key: "phone",
      header: "Telefone",
      size: 150,
      format: (hp) => formatPhone(hp.phone),
    }),
  ];

  return (
    <CadastroListPage
      title="Convênios"
      loading={loading}
      list={list}
      columns={columns}
      canCreate={hasAnyArea(permissions)}
      canDelete={can(Permission.ADMINISTRACAO)}
      createLabel="Novo convênio"
      onCreate={() => setCreateModalOpen(true)}
      deleteTitle="Excluir convênio"
      bulkDeleteTitle={(n) => `Excluir ${n} convênio${plural(n)}`}
      bulkDeleteDescription={(n) =>
        `Tem certeza que deseja excluir ${n} convênio${plural(n)} selecionado${plural(n)}? Esta ação não pode ser desfeita.`
      }
    >
      <NewHealthPlanModal
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
