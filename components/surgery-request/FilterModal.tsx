"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import {
  SurgeryRequestStatus,
  PriorityLevel,
} from "@/types/surgery-request.types";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  statuses: SurgeryRequestStatus[];
  priorities: PriorityLevel[];
  pendencies: string[]; // "none" | "1" | "2" | "3+"
  healthPlanIds: string[];
  procedureNames: string[];
  doctorIds: string[];
  createdAtFrom: Date | null;
  createdAtTo: Date | null;
}

export const DEFAULT_FILTERS: FilterState = {
  statuses: [],
  priorities: [],
  pendencies: [],
  healthPlanIds: [],
  procedureNames: [],
  doctorIds: [],
  createdAtFrom: null,
  createdAtTo: null,
};

export function countActiveFilters(f: FilterState): number {
  let count = 0;
  if (f.statuses.length) count++;
  if (f.priorities.length) count++;
  if (f.pendencies.length) count++;
  if (f.healthPlanIds.length) count++;
  if (f.procedureNames.length) count++;
  if (f.doctorIds.length) count++;
  if (f.createdAtFrom || f.createdAtTo) count++;
  return count;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  currentFilters: FilterState;
  availableHealthPlans: { id: string; name: string }[];
  availableProcedures: { id: string; name: string }[];
  availableDoctors?: { id: string; name: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: SurgeryRequestStatus[] = [
  "Pendente",
  "Enviada",
  "Em Análise",
  "Em Agendamento",
  "Agendada",
  "Realizada",
  "Faturada",
  "Finalizada",
  "Encerrada",
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 1, label: "Baixa" },
  { value: 2, label: "Média" },
  { value: 3, label: "Alta" },
  { value: 4, label: "Urgente" },
];

const PENDENCY_OPTIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3+", label: "3+" },
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
  const f = from.getTime();
  const t = to.getTime();
  const [start, end] = f <= t ? [f, t] : [t, f];
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
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PillToggleProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function PillToggle({ label, selected, onClick }: PillToggleProps) {
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

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
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

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

function CheckboxItem({ label, checked, onChange }: CheckboxItemProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2.5 text-left group"
    >
      <div
        className={`w-5 h-5 rounded flex-shrink-0 border flex items-center justify-center transition-colors
          ${checked ? "bg-teal-700 border-teal-700" : "border-neutral-300 bg-white group-hover:border-teal-400"}`}
      >
        {checked && (
          <svg
            width="11"
            height="8"
            viewBox="0 0 11 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 4L4 7L10 1"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-xs md:text-sm text-neutral-700 leading-tight">
        {label}
      </span>
    </button>
  );
}

// ─── Searchable Multi-Select ──────────────────────────────────────────────────

interface SearchableMultiSelectProps {
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder = "Pesquisar...",
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
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

  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.id)),
    [options, selected],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Input trigger */}
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
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 text-xs md:text-sm outline-none bg-transparent text-neutral-700 placeholder:text-neutral-400"
        />
        {selected.length > 0 && (
          <span className="flex-shrink-0 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tags de itens selecionados */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full pl-2.5 pr-1.5 py-1"
            >
              {opt.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(opt.id);
                }}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-teal-200 transition-colors"
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
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs md:text-sm text-neutral-400 text-center py-4">
              Nenhum resultado
            </p>
          ) : (
            filtered.map((opt) => {
              const isChecked = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggle(opt.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-teal-700 border-teal-700"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {isChecked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-neutral-700 leading-tight">
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

// ─── Calendar Component ───────────────────────────────────────────────────────

interface CalendarProps {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
}

function Calendar({ from, to, onChange }: CalendarProps) {
  const today = new Date();
  const [calYear, setCalYear] = useState(
    from ? from.getFullYear() : today.getFullYear(),
  );
  const [calMonth, setCalMonth] = useState(
    from ? from.getMonth() : today.getMonth(),
  );

  const days = getDaysInMonth(calYear, calMonth);
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun

  // Reorder: week starts on Sunday (0) → index 0
  // PT-BR: S T Q Q S S D → Sun Mon Tue Wed Thu Fri Sat
  // day.getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const paddingCells = firstDayOfWeek; // Sunday = 0 → no padding, Mon = 1 → 1 padding, etc.

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!from || (from && to)) {
        // Start new selection
        onChange(day, null);
      } else {
        // Second click: set end (order doesn't matter)
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
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <div className="select-none">
      {/* Month Navigation */}
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

      {/* Day labels */}
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

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {/* Padding cells */}
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
              {/* Range background */}
              {inRange && (
                <div className="absolute inset-y-1 inset-x-0 bg-teal-50" />
              )}
              {/* Left half background for end edge */}
              {isEnd && !isStart && (
                <div className="absolute inset-y-1 left-0 right-1/2 bg-teal-50" />
              )}
              {/* Right half background for start edge */}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function FilterModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  currentFilters,
  availableHealthPlans,
  availableProcedures,
  availableDoctors = [],
}: FilterModalProps) {
  const [draft, setDraft] = useState<FilterState>(currentFilters);
  const panelRef = useRef<HTMLDivElement>(null);
  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(onClose);

  // Sync draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Pill toggle helpers
  function toggleStatus(status: SurgeryRequestStatus) {
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(status)
        ? d.statuses.filter((s) => s !== status)
        : [...d.statuses, status],
    }));
  }

  function togglePriority(value: PriorityLevel) {
    setDraft((d) => ({
      ...d,
      priorities: d.priorities.includes(value)
        ? d.priorities.filter((p) => p !== value)
        : [...d.priorities, value],
    }));
  }

  function togglePendency(value: string) {
    setDraft((d) => ({
      ...d,
      pendencies: d.pendencies.includes(value)
        ? d.pendencies.filter((p) => p !== value)
        : [...d.pendencies, value],
    }));
  }

  function toggleHealthPlan(id: string) {
    setDraft((d) => ({
      ...d,
      healthPlanIds: d.healthPlanIds.includes(id)
        ? d.healthPlanIds.filter((h) => h !== id)
        : [...d.healthPlanIds, id],
    }));
  }

  function toggleProcedure(name: string) {
    setDraft((d) => ({
      ...d,
      procedureNames: d.procedureNames.includes(name)
        ? d.procedureNames.filter((p) => p !== name)
        : [...d.procedureNames, name],
    }));
  }

  function toggleDoctor(id: string) {
    setDraft((d) => ({
      ...d,
      doctorIds: d.doctorIds.includes(id)
        ? d.doctorIds.filter((dId) => dId !== id)
        : [...d.doctorIds, id],
    }));
  }

  const handleClear = () => {
    setDraft(DEFAULT_FILTERS);
    onClear();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  if (!isOpen) return null;

  const isDragging = dragY > 0;

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end sm:flex-row sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        style={{ opacity: isDragging ? Math.max(0.2, 1 - dragY / 300) : 1 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-h-[92dvh] sm:max-h-full sm:w-[420px] sm:max-w-full sm:h-full bg-white flex flex-col shadow-2xl rounded-t-2xl sm:rounded-none animate-slide-up sm:animate-slide-in-right mobile-sheet-offset"
        style={
          isDragging
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Drag handle (mobile only) — captura swipe para baixo */}
        <div
          className="flex-none flex justify-center pt-3 sm:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
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
          {/* Status da Solicitação */}
          <div>
            <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-3">
              Status da solicitação
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <PillToggle
                  key={s}
                  label={s}
                  selected={draft.statuses.includes(s)}
                  onClick={() => toggleStatus(s)}
                />
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <div className="h-px bg-neutral-100 mb-4" />
            <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-3">
              Prioridade
            </p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <PillToggle
                  key={p.value}
                  label={p.label}
                  selected={draft.priorities.includes(p.value)}
                  onClick={() => togglePriority(p.value)}
                />
              ))}
            </div>
          </div>

          {/* Pendências */}
          <div>
            <div className="h-px bg-neutral-100 mb-4" />
            <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-3">
              Pendências
            </p>
            <div className="flex flex-wrap gap-2">
              {PENDENCY_OPTIONS.map((p) => (
                <PillToggle
                  key={p.value}
                  label={p.label}
                  selected={draft.pendencies.includes(p.value)}
                  onClick={() => togglePendency(p.value)}
                />
              ))}
            </div>
          </div>

          {/* Médico */}
          {availableDoctors.length > 0 && (
            <CollapsibleSection title="Médico">
              <SearchableMultiSelect
                options={availableDoctors}
                selected={draft.doctorIds}
                onToggle={toggleDoctor}
                placeholder="Pesquisar médico..."
              />
            </CollapsibleSection>
          )}

          {/* Convênios */}
          {availableHealthPlans.length > 0 && (
            <CollapsibleSection title="Convênios">
              <SearchableMultiSelect
                options={availableHealthPlans}
                selected={draft.healthPlanIds}
                onToggle={toggleHealthPlan}
                placeholder="Pesquisar convênio..."
              />
            </CollapsibleSection>
          )}

          {/* Procedimentos */}
          {availableProcedures.length > 0 && (
            <CollapsibleSection title="Procedimentos">
              <SearchableMultiSelect
                options={availableProcedures}
                selected={draft.procedureNames}
                onToggle={toggleProcedure}
                placeholder="Pesquisar procedimento..."
              />
            </CollapsibleSection>
          )}

          {/* Data de Criação */}
          <CollapsibleSection title="Data de criação">
            <Calendar
              from={draft.createdAtFrom}
              to={draft.createdAtTo}
              onChange={(from, to) =>
                setDraft((d) => ({
                  ...d,
                  createdAtFrom: from,
                  createdAtTo: to,
                }))
              }
            />
          </CollapsibleSection>

          {/* Bottom spacer */}
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
