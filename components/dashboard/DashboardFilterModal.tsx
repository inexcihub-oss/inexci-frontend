"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import { hospitalService } from "@/services/hospital.service";
import { healthPlanService } from "@/services/health-plan.service";
import type { ReportFilters } from "@/services/reports.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodKey = "all" | "7d" | "30d" | "90d" | "12m" | "custom";

export interface DashboardFilters {
  period: PeriodKey;
  customFrom: Date | null;
  customTo: Date | null;
  hospitalId: string;
  healthPlanId: string;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  period: "all",
  customFrom: null,
  customTo: null,
  hospitalId: "",
  healthPlanId: "",
};

export function countActiveDashboardFilters(f: DashboardFilters): number {
  let count = 0;
  if (f.period !== "all") count++;
  if (f.hospitalId) count++;
  if (f.healthPlanId) count++;
  return count;
}

export function buildReportFilters(f: DashboardFilters): ReportFilters {
  const filters: ReportFilters = {};
  if (f.hospitalId) filters.hospitalId = f.hospitalId;
  if (f.healthPlanId) filters.healthPlanId = f.healthPlanId;

  if (f.period === "custom") {
    const [from, to] =
      f.customFrom && f.customTo && f.customFrom > f.customTo
        ? [f.customTo, f.customFrom]
        : [f.customFrom, f.customTo];
    if (from) {
      const s = new Date(from);
      s.setHours(0, 0, 0, 0);
      filters.startDate = s.toISOString();
    }
    if (to) {
      const e = new Date(to);
      e.setHours(23, 59, 59, 999);
      filters.endDate = e.toISOString();
    }
  } else if (f.period !== "all") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    switch (f.period) {
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      case "12m":
        start.setMonth(start.getMonth() - 12);
        break;
    }
    filters.startDate = start.toISOString();
    filters.endDate = end.toISOString();
  }

  return filters;
}

interface DashboardFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: DashboardFilters) => void;
  onClear: () => void;
  currentFilters: DashboardFilters;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "12m", label: "12 meses" },
  { key: "custom", label: "Personalizado" },
];

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(day: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const d = day.getTime();
  const [start, end] =
    from.getTime() <= to.getTime()
      ? [from.getTime(), to.getTime()]
      : [to.getTime(), from.getTime()];
  return d > start && d < end;
}

function isRangeEdge(
  day: Date,
  from: Date | null,
  to: Date | null,
): "start" | "end" | "single" | null {
  if (!from) return null;
  if (isSameDay(day, from)) {
    if (!to || isSameDay(day, to)) return "single";
    return "start";
  }
  if (to && isSameDay(day, to)) return "end";
  return null;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
  return days;
}

// ─── PillToggle ───────────────────────────────────────────────────────────────

function PillToggle({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-4 rounded-full border text-xs md:text-sm font-medium transition-all whitespace-nowrap
        ${
          selected
            ? "border-teal-700 bg-teal-700 text-white"
            : "border-neutral-200 text-neutral-500 bg-white hover:border-neutral-300"
        }`}
    >
      {label}
    </button>
  );
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="h-px bg-neutral-100 mb-4" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-4"
      >
        <span className="text-xs md:text-sm font-semibold text-neutral-900">
          {title}
        </span>
        <Image
          src="/icons/chevron-right.svg"
          alt={open ? "Fechar" : "Abrir"}
          width={16}
          height={16}
          className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── SearchableSingleSelect ───────────────────────────────────────────────────

function SearchableSingleSelect({
  options,
  selected,
  onSelect,
  placeholder = "Pesquisar...",
}: {
  options: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () =>
      options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const selectedOption = options.find((o) => o.id === selected);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 min-h-10 px-3 py-2 border rounded-xl cursor-text transition-colors ${
          open
            ? "border-teal-600 ring-1 ring-teal-600/20"
            : "border-neutral-200 hover:border-neutral-300"
        }`}
        onClick={() => setOpen(true)}
      >
        <svg
          className="w-4 h-4 text-neutral-400 flex-shrink-0"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M11 11l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selectedOption ? selectedOption.name : placeholder}
          className="flex-1 text-xs md:text-sm outline-none bg-transparent text-neutral-700 placeholder:text-neutral-500"
        />
        {selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("");
              setQuery("");
            }}
            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M7 1L1 7M1 1l6 6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onSelect("");
              setQuery("");
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left border-b border-neutral-100"
          >
            <span className="text-xs md:text-sm text-neutral-400 italic">
              Todos
            </span>
          </button>
          {filtered.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Nenhum resultado
            </p>
          ) : (
            filtered.map((opt) => {
              const isSelected = opt.id === selected;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelect(opt.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-teal-700 border-teal-700"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-neutral-700">
                    {opt.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({
  from,
  to,
  onChange,
}: {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
}) {
  const today = new Date();
  const [calYear, setCalYear] = useState(
    from ? from.getFullYear() : today.getFullYear(),
  );
  const [calMonth, setCalMonth] = useState(
    from ? from.getMonth() : today.getMonth(),
  );

  const days = getDaysInMonth(calYear, calMonth);
  const paddingCells = new Date(calYear, calMonth, 1).getDay();

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!from || (from && to)) {
        onChange(day, null);
      } else {
        if (isSameDay(day, from)) {
          onChange(null, null);
        } else {
          onChange(from, day);
        }
      }
    },
    [from, to, onChange],
  );

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
        >
          <Image
            src="/icons/chevron-left.svg"
            alt="Mês anterior"
            width={16}
            height={16}
          />
        </button>
        <span className="text-xs md:text-sm font-semibold text-neutral-900">
          {MONTH_NAMES[calMonth]} de {calYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
        >
          <Image
            src="/icons/chevron-right.svg"
            alt="Próximo mês"
            width={16}
            height={16}
          />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center h-8 text-xs font-medium text-neutral-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: paddingCells }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const edge = isRangeEdge(day, from, to);
          const inRange = isInRange(day, from, to);
          const isToday = isSameDay(day, new Date());
          const isStart = edge === "start" || edge === "single";
          const isEnd = edge === "end" || edge === "single";
          const isSelected = edge !== null;

          return (
            <div
              key={day.getDate()}
              className="relative flex items-center justify-center h-9"
            >
              {inRange && (
                <div className="absolute inset-y-1 inset-x-0 bg-teal-50" />
              )}
              {isEnd && !isStart && (
                <div className="absolute inset-y-1 left-0 right-1/2 bg-teal-50" />
              )}
              {isStart && !isEnd && (
                <div className="absolute inset-y-1 left-1/2 right-0 bg-teal-50" />
              )}
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs md:text-sm transition-colors
                  ${
                    isSelected
                      ? "bg-teal-700 text-white font-semibold"
                      : inRange
                        ? "text-teal-700 font-medium hover:bg-teal-100"
                        : isToday
                          ? "text-teal-700 font-bold ring-2 ring-teal-500 hover:bg-teal-50"
                          : "text-neutral-700 hover:bg-neutral-100"
                  }`}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardFilterModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  currentFilters,
}: DashboardFilterModalProps) {
  const [draft, setDraft] = useState<DashboardFilters>(currentFilters);
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [healthPlans, setHealthPlans] = useState<
    { id: string; name: string }[]
  >([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync draft when modal opens
  useEffect(() => {
    if (isOpen) setDraft(currentFilters);
  }, [isOpen, currentFilters]);

  // Load options once
  useEffect(() => {
    hospitalService
      .getAll()
      .then((data) =>
        setHospitals(data.map((h) => ({ id: h.id, name: h.name }))),
      )
      .catch(() => {});
    healthPlanService
      .getAll()
      .then((data) =>
        setHealthPlans(data.map((hp) => ({ id: hp.id, name: hp.name }))),
      )
      .catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleClear = () => {
    setDraft(DEFAULT_DASHBOARD_FILTERS);
    onClear();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-h-[92dvh] sm:max-h-full sm:w-[420px] sm:max-w-full sm:h-full bg-white flex flex-col shadow-2xl rounded-t-2xl sm:rounded-none animate-slide-in-right"
      >
        {/* Drag handle (mobile only) */}
        <div className="flex-none flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 py-3 md:px-6 md:py-5 border-b border-neutral-100">
          <h2 className="ds-modal-title">Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-500"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M14 4L4 14M4 4l10 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4 space-y-3 md:space-y-5">
          {/* Período */}
          <div>
            <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-3">
              Período
            </p>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((opt) => (
                <PillToggle
                  key={opt.key}
                  label={opt.label}
                  selected={draft.period === opt.key}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      period: opt.key,
                      customFrom: null,
                      customTo: null,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Calendário (só para "custom") */}
          {draft.period === "custom" && (
            <CollapsibleSection title="Data de criação">
              <Calendar
                from={draft.customFrom}
                to={draft.customTo}
                onChange={(from, to) =>
                  setDraft((d) => ({ ...d, customFrom: from, customTo: to }))
                }
              />
              {(draft.customFrom || draft.customTo) && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      customFrom: null,
                      customTo: null,
                    }))
                  }
                  className="mt-3 text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  Limpar datas
                </button>
              )}
            </CollapsibleSection>
          )}

          {/* Hospital */}
          {hospitals.length > 0 && (
            <CollapsibleSection title="Hospital">
              <SearchableSingleSelect
                options={hospitals}
                selected={draft.hospitalId}
                onSelect={(id) => setDraft((d) => ({ ...d, hospitalId: id }))}
                placeholder="Pesquisar hospital..."
              />
            </CollapsibleSection>
          )}

          {/* Convênio */}
          {healthPlans.length > 0 && (
            <CollapsibleSection title="Convênio">
              <SearchableSingleSelect
                options={healthPlans}
                selected={draft.healthPlanId}
                onSelect={(id) => setDraft((d) => ({ ...d, healthPlanId: id }))}
                placeholder="Pesquisar convênio..."
              />
            </CollapsibleSection>
          )}

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="flex-none px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="ds-btn-primary"
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </div>
  );
}
