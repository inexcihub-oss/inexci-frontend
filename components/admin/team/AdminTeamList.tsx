"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminKeys } from "@/lib/query-keys";
import { formatRelative } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import {
  adminService,
  type PlatformAdminMember,
} from "@/services/admin.service";
import { NewAdminModal } from "./NewAdminModal";
import { RevokeAdminModal } from "./RevokeAdminModal";
import { ResetAdminAccessModal } from "./ResetAdminAccessModal";

function Badge({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function MemberBadge({ member }: { member: PlatformAdminMember }) {
  if (member.status === "pending") {
    return (
      <Badge className="bg-amber-50 text-amber-700">Convite pendente</Badge>
    );
  }
  if (member.status === "inactive") {
    return <Badge className="bg-gray-100 text-gray-600">Revogado</Badge>;
  }
  return member.mfaEnabled ? (
    <Badge className="bg-emerald-50 text-emerald-700">MFA ativo</Badge>
  ) : (
    <Badge className="bg-amber-50 text-amber-700">MFA pendente</Badge>
  );
}

export function AdminTeamList() {
  const { admin } = useAdminAuth();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<PlatformAdminMember | null>(null);
  const [resetting, setResetting] = useState<PlatformAdminMember | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.team(),
    queryFn: () => adminService.listTeam(),
  });

  const items = data ?? [];

  const columns: AdminColumn<PlatformAdminMember>[] = [
    {
      key: "admin",
      header: "Administrador",
      mobile: "title",
      cell: (m) => (
        <>
          <p className="font-medium text-gray-900">{m.name}</p>
          <p className="text-xs font-normal text-gray-500">{m.email}</p>
        </>
      ),
    },
    {
      key: "situacao",
      header: "Situação",
      mobile: "badge",
      cell: (m) => <MemberBadge member={m} />,
    },
    {
      key: "acesso",
      header: "Último acesso",
      className: "whitespace-nowrap text-gray-500",
      cell: (m) => formatRelative(m.lastSeenAt ?? null),
    },
    {
      key: "criado",
      header: "Criado por",
      className: "text-gray-600",
      cell: (m) => m.createdBy ?? "—",
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      mobileLabel: "Ações",
      mobile: "full",
      className: "text-right",
      cell: (m) =>
        m.id !== admin?.id && m.status !== "inactive" ? (
          <div className="flex flex-wrap gap-2 sm:justify-end sm:gap-3">
            <button
              type="button"
              className="ds-btn-inline"
              onClick={() => setResetting(m)}
            >
              Redefinir acesso
            </button>
            <button
              type="button"
              className="ds-btn-inline text-red-600"
              onClick={() => setRevoking(m)}
            >
              Revogar acesso
            </button>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">
              Administradores
            </h1>
            <p className="text-xs text-neutral-500">
              Quem tem acesso ao painel da Inexci
            </p>
          </div>
          <button
            type="button"
            className="ds-toolbar-btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo administrador
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Não foi possível carregar os administradores"
              description="Tente novamente em instantes."
            />
          ) : items.length === 0 ? (
            <EmptyState title="Nenhum administrador" />
          ) : (
            <AdminDataTable
              rows={items}
              columns={columns}
              rowKey={(m) => m.id}
            />
          )}
        </div>
      </div>

      {creating && <NewAdminModal isOpen onClose={() => setCreating(false)} />}
      {revoking && (
        <RevokeAdminModal
          isOpen
          adminId={revoking.id}
          name={revoking.name}
          onClose={() => setRevoking(null)}
        />
      )}
      {resetting && (
        <ResetAdminAccessModal
          isOpen
          adminId={resetting.id}
          name={resetting.name}
          email={resetting.email}
          onClose={() => setResetting(null)}
        />
      )}
    </PageContainer>
  );
}
