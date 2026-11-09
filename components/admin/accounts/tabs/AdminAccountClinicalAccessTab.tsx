"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Download,
  FileLock2,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { ErrorDailyChart } from "@/components/admin/errors/ErrorDailyChart";
import { AdminReasonModal } from "@/components/admin/team/AdminReasonModal";
import {
  CLINICAL_PERIODS,
  buildClinicalAccessCsv,
  clinicalActionLabel,
  clinicalOriginLabel,
  clinicalResourceLabel,
  formatPatientRef,
  normalizePatientLookup,
} from "@/lib/admin-security";
import { adminKeys } from "@/lib/query-keys";
import { cn, formatDateTime } from "@/lib/utils";
import {
  adminService,
  type AdminClinicalAccessDays,
  type AdminClinicalAccessPatientResult,
} from "@/services/admin.service";

const SAO_PAULO_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminAccountClinicalAccessTab({
  ownerId,
}: {
  ownerId: string;
}) {
  const [days, setDays] = useState<AdminClinicalAccessDays>(30);
  const [exporting, setExporting] = useState(false);
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pendingPatient, setPendingPatient] = useState<string | null>(null);
  const [patientResult, setPatientResult] =
    useState<AdminClinicalAccessPatientResult | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountClinicalAccess(ownerId, days),
    queryFn: () => adminService.getAccountClinicalAccess(ownerId, days),
    placeholderData: (previous) => previous,
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Período" className="ds-segmented">
        {CLINICAL_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            aria-pressed={days === p.days}
            onClick={() => {
              setDays(p.days);
              setPatientResult(null);
            }}
            className={cn(
              "ds-segmented-item whitespace-nowrap",
              days === p.days && "ds-segmented-item-active",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setExporting(true)}
        className="ds-toolbar-btn"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Exportar CSV
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState title="Não foi possível carregar os acessos a prontuário" />
    );
  }

  const submitLookup = () => {
    const patient = normalizePatientLookup(lookup);
    if (!patient) {
      setLookupError(
        "Informe o código mostrado na lista (10 caracteres) ou o id completo do paciente.",
      );
      return;
    }
    setLookupError(null);
    setPendingPatient(patient);
  };

  const viaAi = data.byAction
    .filter((row) => row.origin === "ai")
    .reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs text-gray-600">
          Acessos registrados pela auditoria da LGPD. O paciente aparece só por
          um código anônimo e nenhum conteúdo clínico sai da clínica.
        </p>
        {toolbar}
      </div>

      <AdminStatGrid columns={3}>
        <AdminStatCard
          icon={FileLock2}
          accent="violet"
          label="Acessos a prontuário"
          value={data.totals.total}
          hint={`Nos últimos ${days} dias`}
        />
        <AdminStatCard
          icon={Users}
          accent="blue"
          label="Usuários que acessaram"
          value={data.totals.users}
        />
        <AdminStatCard
          icon={Bot}
          accent="teal"
          label="Pelo assistente de IA"
          value={viaAi}
          hint="Acessos feitos pelo WhatsApp"
        />
      </AdminStatGrid>

      <AdminSection title="Acessos por dia" accent="violet">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <ErrorDailyChart
            daily={data.daily}
            fromDay={SAO_PAULO_DAY.format(new Date(data.from))}
            toDay={SAO_PAULO_DAY.format(new Date(data.to))}
            label="Acessos"
          />
        </div>
      </AdminSection>

      <AdminSection title="Por tipo de acesso" accent="blue">
        {data.byAction.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum acesso no período.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {data.byAction.map((row) => (
              <li
                key={`${row.resource}-${row.action}-${row.origin}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <span className="text-sm text-gray-900">
                  {clinicalActionLabel(row.action)} ·{" "}
                  {clinicalResourceLabel(row.resource)}
                  <span className="ml-2 ds-badge-sm bg-gray-100 text-gray-600">
                    {clinicalOriginLabel(row.origin)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {row.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Por usuário" accent="teal">
        {data.byUser.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum acesso no período.</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {data.byUser.map((row) => (
                <li
                  key={`${row.userId}-${row.resource}-${row.action}`}
                  className="rounded-2xl border border-gray-200 bg-white p-3.5 text-sm shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">
                      {row.userName ?? "Usuário removido"}
                    </p>
                    <span className="font-semibold text-gray-900">
                      {row.total}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {clinicalActionLabel(row.action)} ·{" "}
                    {clinicalResourceLabel(row.resource)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Último em {formatDateTime(row.lastAccessAt)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byUser.map((row) => (
                    <TableRow
                      key={`${row.userId}-${row.resource}-${row.action}`}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {row.userName ?? "Usuário removido"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {clinicalActionLabel(row.action)} ·{" "}
                        {clinicalResourceLabel(row.resource)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.total}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(row.lastAccessAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </AdminSection>

      <AdminSection
        title="Por paciente"
        description="Pacientes mais acessados no período, identificados só por um código. Ver os acessos de um paciente pede um motivo e fica no histórico de ações."
        accent="amber"
      >
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          onSubmit={(event) => {
            event.preventDefault();
            submitLookup();
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Código ou id do paciente"
              placeholder="Código da lista ou id do paciente informado pela clínica"
              value={lookup}
              onChange={(event) => {
                setLookup(event.target.value);
                setLookupError(null);
              }}
              error={lookupError ?? undefined}
            />
          </div>
          <button type="submit" className="ds-toolbar-btn shrink-0">
            <Search className="h-4 w-4" aria-hidden="true" />
            Ver acessos
          </button>
        </form>

        {patientResult && (
          <div
            role="region"
            aria-label={`Acessos ao paciente ${formatPatientRef(patientResult.patientRef)}`}
            className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Acessos ao paciente{" "}
                  {formatPatientRef(patientResult.patientRef)}
                </p>
                <p className="text-xs text-gray-600">
                  {patientResult.items.length === patientResult.limit
                    ? `Os ${patientResult.limit} mais recentes nos últimos ${days} dias`
                    : `${patientResult.items.length} ${patientResult.items.length === 1 ? "acesso" : "acessos"} nos últimos ${days} dias`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPatientResult(null)}
                className="ds-toolbar-btn ds-toolbar-icon"
                aria-label="Fechar acessos do paciente"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {patientResult.items.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                Nenhum acesso a este paciente no período.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-amber-100 rounded-xl border border-amber-100 bg-white">
                {patientResult.items.map((item, index) => (
                  <li
                    key={`${item.createdAt}-${item.userId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">
                        {item.userName ?? "Usuário removido"}
                      </span>
                      <span className="block text-xs text-gray-600">
                        {clinicalActionLabel(item.action)} ·{" "}
                        {clinicalResourceLabel(item.resource)}
                        <span className="ml-2 ds-badge-sm bg-gray-100 text-gray-600">
                          {clinicalOriginLabel(item.origin)}
                        </span>
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {data.byPatient.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum acesso a paciente no período.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {data.byPatient.map((row) => (
              <li
                key={row.patientRef}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <UserRound
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {formatPatientRef(row.patientRef)}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {row.users} {row.users === 1 ? "usuário" : "usuários"} ·
                      último em {formatDateTime(row.lastAccessAt)}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {row.total}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPatient(row.patientRef)}
                    className="ds-toolbar-btn"
                    aria-label={`Ver acessos ao paciente ${formatPatientRef(row.patientRef)}`}
                  >
                    Ver acessos
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {pendingPatient && (
        <AdminReasonModal
          isOpen
          onClose={() => setPendingPatient(null)}
          title="Ver acessos ao prontuário do paciente"
          confirmLabel="Ver acessos"
          loadingLabel="Consultando..."
          successMessage="Acessos carregados."
          reasonId="clinical-access-patient-reason"
          action={async (reason) => {
            const result = await adminService.getAccountClinicalAccessPatient(
              ownerId,
              { patient: pendingPatient, days, reason },
            );
            setPatientResult(result);
            return result;
          }}
        >
          <p className="text-sm text-gray-700">
            Mostra quem acessou o prontuário deste paciente nos últimos {days}{" "}
            dias, sem nome nem conteúdo clínico. A consulta fica registrada no
            histórico de ações com o motivo.
          </p>
        </AdminReasonModal>
      )}

      {exporting && (
        <AdminReasonModal
          isOpen
          onClose={() => setExporting(false)}
          title="Exportar acessos a prontuário"
          confirmLabel="Exportar"
          loadingLabel="Exportando..."
          successMessage="Arquivo gerado."
          reasonId="clinical-access-export-reason"
          action={async (reason) => {
            const result = await adminService.exportAccountClinicalAccess(
              ownerId,
              days,
              reason,
            );
            downloadCsv(
              buildClinicalAccessCsv(result.items),
              `acessos-prontuario-${days}-dias.csv`,
            );
            return result;
          }}
        >
          <p className="text-sm text-gray-700">
            O arquivo traz a quantidade de acessos por usuário nos últimos{" "}
            {days} dias, sem nome nem dado de paciente. A exportação fica
            registrada no histórico de ações com o motivo.
          </p>
        </AdminReasonModal>
      )}
    </div>
  );
}
