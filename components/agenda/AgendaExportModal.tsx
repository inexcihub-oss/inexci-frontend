"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DateInput } from "@/components/ui/DateInput";
import Button from "@/components/ui/Button";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  AgendaExportStatusFilter,
  exportAgendaToCsv,
  exportAgendaToPdf,
  filterAgendaItems,
  formatPeriodLabel,
  normalizeAgendaItems,
} from "@/lib/export-agenda";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { AvailableDoctor } from "@/types";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";

type StatusFilter = AgendaExportStatusFilter;

interface AgendaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFrom: string;
  defaultTo: string;
  defaultStatusFilter: StatusFilter;
  availableDoctors?: AvailableDoctor[];
  defaultDoctorIds?: string[];
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: null, label: "Todos" },
  { value: 5, label: "Agendada" },
  { value: 6, label: "Realizada" },
];

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toApiRange(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59.999");
  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };
}

export function AgendaExportModal({
  isOpen,
  onClose,
  defaultFrom,
  defaultTo,
  defaultStatusFilter,
  availableDoctors = [],
  defaultDoctorIds = [],
}: AgendaExportModalProps) {
  const { showToast } = useToast();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(defaultStatusFilter);
  const [selectedDoctorIds, setSelectedDoctorIds] =
    useState<string[]>(defaultDoctorIds);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "csv" | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    setFrom(defaultFrom);
    setTo(defaultTo);
    setStatusFilter(defaultStatusFilter);
    setSelectedDoctorIds(defaultDoctorIds);
    setExportingFormat(null);
  }, [isOpen, defaultFrom, defaultTo, defaultStatusFilter, defaultDoctorIds]);

  const datesAreValid = isValidIsoDate(from) && isValidIsoDate(to);
  const rangeIsValid = datesAreValid && from <= to;
  const isExporting = exportingFormat !== null;

  const { data, isFetching, isError } = useQuery({
    queryKey: ["surgery-requests", "agenda-export", from, to],
    queryFn: () => {
      const range = toApiRange(from, to);
      return surgeryRequestService.getAgenda(range.from, range.to);
    },
    enabled: isOpen && rangeIsValid,
  });

  const previewItems = useMemo(() => {
    const items = normalizeAgendaItems(data?.records ?? []);
    return filterAgendaItems(items, {
      from,
      to,
      statusFilter,
      doctorIds: selectedDoctorIds,
    });
  }, [data, from, to, statusFilter, selectedDoctorIds]);

  const doctorFilterLabel = useMemo(() => {
    if (selectedDoctorIds.length === 0) return "Todos";
    return availableDoctors
      .filter((doctor) => selectedDoctorIds.includes(doctor.id))
      .map((doctor) => doctor.name)
      .join(", ");
  }, [availableDoctors, selectedDoctorIds]);

  const previewCountByDoctorId = useMemo(() => {
    const items = normalizeAgendaItems(data?.records ?? []);
    const inPeriod = filterAgendaItems(items, { from, to, statusFilter });
    const counts: Record<string, number> = {};
    inPeriod.forEach((item) => {
      const doctorId = item.doctor?.id;
      if (!doctorId) return;
      counts[doctorId] = (counts[doctorId] ?? 0) + 1;
    });
    return counts;
  }, [data, from, to, statusFilter]);

  const handleExport = async (format: "pdf" | "csv") => {
    if (!rangeIsValid) {
      showToast("Informe um período válido para exportar.", "error");
      return;
    }

    setExportingFormat(format);

    try {
      const range = toApiRange(from, to);
      const response = await surgeryRequestService.getAgenda(
        range.from,
        range.to,
      );
      const items = normalizeAgendaItems(response.records);
      const filtered = filterAgendaItems(items, {
        from,
        to,
        statusFilter,
        doctorIds: selectedDoctorIds,
      });

      if (filtered.length === 0) {
        showToast("Nenhuma cirurgia encontrada no período selecionado.", "error");
        return;
      }

      const options = {
        from,
        to,
        statusFilter,
        doctorIds: selectedDoctorIds,
        doctorFilterLabel,
      };
      if (format === "pdf") {
        exportAgendaToPdf(filtered, options);
      } else {
        exportAgendaToCsv(filtered, options);
      }

      onClose();
    } catch {
      showToast("Não foi possível exportar a agenda. Tente novamente.", "error");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar agenda" size="sm">
      <div className="p-5 md:p-6 space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          Escolha o período, os médicos e o status das cirurgias que deseja
          incluir no relatório.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateInput
            id="agenda-export-from"
            label="Data inicial"
            value={from}
            onChange={setFrom}
            required
          />
          <DateInput
            id="agenda-export-to"
            label="Data final"
            value={to}
            onChange={setTo}
            required
          />
        </div>

        {!rangeIsValid && datesAreValid && (
          <p className="text-xs text-red-500">
            A data inicial deve ser anterior ou igual à data final.
          </p>
        )}

        <div>
          <p className="ds-label mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px]",
                  statusFilter === option.value
                    ? "bg-teal-600 text-white"
                    : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {availableDoctors.length > 1 && (
          <AgendaDoctorFilter
            doctors={availableDoctors}
            selectedDoctorIds={selectedDoctorIds}
            onChange={setSelectedDoctorIds}
            countByDoctorId={previewCountByDoctorId}
          />
        )}

        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            Prévia
          </p>
          {isFetching ? (
            <p className="text-sm text-neutral-500">Carregando cirurgias...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">
              Não foi possível carregar a prévia do período.
            </p>
          ) : (
            <p className="text-sm text-neutral-700">
              <span className="font-semibold text-neutral-900">
                {previewItems.length}
              </span>{" "}
              {previewItems.length === 1 ? "cirurgia" : "cirurgias"} entre{" "}
              {formatPeriodLabel(from, to)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="w-full sm:w-auto order-3 sm:order-1"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={!rangeIsValid || isFetching || isExporting}
            className="w-full sm:w-auto order-2"
          >
            {exportingFormat === "csv" ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </span>
            ) : (
              "Exportar CSV"
            )}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleExport("pdf")}
            disabled={!rangeIsValid || isFetching || isExporting}
            className="w-full sm:w-auto min-w-[140px] order-1 sm:order-3"
          >
            {exportingFormat === "pdf" ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </span>
            ) : (
              "Exportar PDF"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
