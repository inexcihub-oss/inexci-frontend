"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import Loading from "@/components/ui/Loading";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
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

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Configurações de status usadas em filtros, badges e calendário
const STATUS_CONFIG: Record<
  number,
  { label: string; badge: string; dot: string; filter: string; active: string }
> = {
  5: {
    label: "Agendada",
    badge: "bg-teal-50 text-teal-700 border border-teal-200",
    dot: "bg-teal-500",
    filter: "border border-teal-300 text-teal-700 hover:bg-teal-50",
    active: "bg-teal-600 text-white border border-teal-600",
  },
  6: {
    label: "Realizada",
    badge: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
    filter: "border border-green-300 text-green-700 hover:bg-green-50",
    active: "bg-green-600 text-white border border-green-600",
  },
};

// Status 7 e 8 são exibidos como "Realizada" (já passaram do estágio)
const DISPLAY_STATUS = (status: number): number => (status >= 6 ? 6 : status);

// Ordem de prioridade de cor para o calendário (status mais relevante por dia)
const STATUS_PRIORITY = [5, 6]; // Agendada > Realizada

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  if (hours === "00" && minutes === "00") return "—";
  return `${hours}:${minutes}`;
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Retorna "YYYY-MM-DD" em horário local */
function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type AgendaItem = SurgeryRequestListItem & { surgeryDate: string };
type StatusFilter = 4 | 5 | 6 | null; // null = todos

/** Mapa de data → { total, statusPrioritário } para colorir o calendário */
type DayEventMap = Map<string, { count: number; topStatus: number }>;

// ─── Componente de chip de status ─────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const cfg = STATUS_CONFIG[DISPLAY_STATUS(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        cfg?.badge ?? "bg-gray-50 text-gray-600 border border-gray-200",
      )}
    >
      {cfg?.label ?? String(status)}
    </span>
  );
}

// ─── Card de cirurgia ─────────────────────────────────────────────────────────

function SurgeryCard({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick: () => void;
}) {
  const time = formatTime(item.surgeryDate);
  const [hh, mm] = time !== "—" ? time.split(":") : ["", ""];
  const dotColor =
    STATUS_CONFIG[DISPLAY_STATUS(item.status)]?.dot ?? "bg-gray-400";

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200 transition-all duration-150 group"
    >
      {/* Horário */}
      <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-teal-50 border border-teal-100">
        {time !== "—" ? (
          <>
            <span className="text-base font-bold text-teal-700 leading-none">
              {hh}
            </span>
            <span className="text-xs text-teal-500 leading-none">:{mm}</span>
          </>
        ) : (
          <span className="text-sm text-teal-400">—</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
          <span className="text-sm font-semibold text-neutral-900 truncate">
            {item.patient?.name ?? "Paciente não informado"}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-xs text-neutral-500 truncate mb-1">
          {item.procedure?.name ??
            (item.tussProcedure?.description || item.procedureName) ??
            "Procedimento não informado"}
        </p>
        <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
          {item.hospital?.name && (
            <span className="flex items-center gap-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {item.hospital.name}
            </span>
          )}
          {item.doctor?.name && (
            <span className="flex items-center gap-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Dr. {item.doctor.name}
            </span>
          )}
          {item.protocol && (
            <span className="text-neutral-300">#{item.protocol}</span>
          )}
        </div>
      </div>

      {/* Seta */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 mt-1 text-neutral-300 group-hover:text-neutral-500 transition-colors"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Mini calendário ──────────────────────────────────────────────────────────

/** Cores de fundo para o dia baseado no status prioritário */
const DAY_STATUS_BG: Record<
  number,
  { bg: string; text: string; ring: string }
> = {
  5: { bg: "bg-teal-100", text: "text-teal-800", ring: "ring-1 ring-teal-400" },
  4: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-1 ring-amber-400",
  },
  6: {
    bg: "bg-green-100",
    text: "text-green-800",
    ring: "ring-1 ring-green-400",
  },
};

function MiniCalendar({
  year,
  month,
  dayEventMap,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number; // 0-based
  dayEventMap: DayEventMap;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toLocalDateKey(new Date().toISOString());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-neutral-900">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-neutral-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Células */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const key = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          const event = dayEventMap.get(key);
          const hasEvent = !!event;
          const isSelected = selectedDay === key;
          const isToday = key === todayKey;
          const eventStyle = hasEvent ? DAY_STATUS_BG[event!.topStatus] : null;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(isSelected ? null : key)}
              className={cn(
                "relative flex flex-col items-center justify-center h-9 rounded-lg text-sm transition-all duration-100",
                isSelected
                  ? "bg-teal-600 text-white font-bold shadow-md"
                  : hasEvent
                    ? cn(
                        eventStyle!.bg,
                        eventStyle!.text,
                        eventStyle!.ring,
                        "font-semibold",
                      )
                    : isToday
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "hover:bg-neutral-50 text-neutral-700",
              )}
              title={
                hasEvent
                  ? `${event!.count} cirurgia${event!.count > 1 ? "s" : ""}`
                  : undefined
              }
            >
              <span className="leading-none">{day}</span>
              {/* Contador de cirurgias no canto superior direito */}
              {hasEvent && !isSelected && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center",
                    event!.topStatus === 5
                      ? "bg-teal-600 text-white"
                      : event!.topStatus === 4
                        ? "bg-amber-500 text-white"
                        : "bg-green-600 text-white",
                  )}
                >
                  {event!.count}
                </span>
              )}
              {/* Ponto indicador quando selecionado (sem contador) */}
              {isSelected && hasEvent && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda de cores */}
      <div className="mt-3 flex flex-col gap-1.5">
        {STATUS_PRIORITY.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "w-3 h-3 rounded-full shrink-0",
                STATUS_CONFIG[s].dot,
              )}
            />
            <span className="text-xs text-neutral-500">
              {STATUS_CONFIG[s].label}
            </span>
          </div>
        ))}
      </div>

      {/* Limpar filtro de data */}
      {selectedDay && (
        <button
          onClick={() => onSelectDay(null)}
          className="mt-3 w-full text-xs text-teal-600 hover:text-teal-800 transition-colors text-center font-medium"
        >
          Limpar filtro de data
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AgendaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  // ── Buscar cirurgias ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { records } = await surgeryRequestService.getScheduled();

      // Filtra apenas os que possuem surgery_date preenchida
      const agenda: AgendaItem[] = records
        .filter(
          (r): r is AgendaItem =>
            typeof r.surgeryDate === "string" && r.surgeryDate.length > 0,
        )
        .sort(
          (a, b) =>
            new Date(a.surgeryDate).getTime() -
            new Date(b.surgeryDate).getTime(),
        );

      setItems(agenda);
    } catch {
      setError("Não foi possível carregar a agenda. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Navegar para o mês corrente ao limpar filtro de dia ────────────────────
  const handleSelectDay = useCallback((day: string | null) => {
    setSelectedDay(day);
    if (day) {
      const d = new Date(day + "T00:00:00");
      setCalMonth(d.getMonth());
      setCalYear(d.getFullYear());
    }
  }, []);

  // ── Derivados ──────────────────────────────────────────────────────────────

  /** Mapa data→{count, topStatus} considerando TODOS os itens (ignora filtro de status) */
  const dayEventMap = useMemo<DayEventMap>(() => {
    const map: DayEventMap = new Map();
    items.forEach((i) => {
      const key = toLocalDateKey(i.surgeryDate);
      const displayStatus = DISPLAY_STATUS(i.status);
      const prev = map.get(key);
      const prevPriorityIdx = prev
        ? STATUS_PRIORITY.indexOf(prev.topStatus)
        : Infinity;
      const currPriorityIdx = STATUS_PRIORITY.indexOf(displayStatus);
      map.set(key, {
        count: (prev?.count ?? 0) + 1,
        topStatus:
          currPriorityIdx < prevPriorityIdx
            ? displayStatus
            : (prev?.topStatus ?? displayStatus),
      });
    });
    return map;
  }, [items]);

  /** Itens filtrados por status e por dia */
  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter !== null)
      result = result.filter((i) => DISPLAY_STATUS(i.status) === statusFilter);
    if (selectedDay)
      result = result.filter(
        (i) => toLocalDateKey(i.surgeryDate) === selectedDay,
      );
    return result;
  }, [items, statusFilter, selectedDay]);

  /** Agrupa por data local */
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    filteredItems.forEach((item) => {
      const key = toLocalDateKey(item.surgeryDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  // ── Helpers de navegação do calendário ────────────────────────────────────
  const prevMonth = useCallback(() => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  }, [calMonth]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 px-4 lg:px-6 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/calendar-schedule.svg"
                alt="Agenda"
                width={22}
                height={22}
              />
              <h1 className="text-lg font-bold text-neutral-900">Agenda</h1>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={loading ? "animate-spin" : ""}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Atualizar
            </button>
          </div>

          {/* Filtros de status */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                statusFilter === null
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
              )}
            >
              Todos
              <span className="ml-1.5 opacity-70">{items.length}</span>
            </button>
            {([5, 6] as const).map((s) => {
              const count = items.filter(
                (i) => DISPLAY_STATUS(i.status) === s,
              ).length;
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    statusFilter === s ? cfg.active : cfg.filter,
                  )}
                >
                  {cfg.label}
                  <span className="ml-1.5 opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Corpo principal */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda — calendário e resumo */}
          <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0 p-4 border-r border-neutral-100 overflow-y-auto">
            <MiniCalendar
              year={calYear}
              month={calMonth}
              dayEventMap={dayEventMap}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />

            {/* Resumo */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                Resumo
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Total</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {items.length}
                  </span>
                </div>
                {([5, 6] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          STATUS_CONFIG[s].dot,
                        )}
                      />
                      <span className="text-sm text-neutral-600">
                        {STATUS_CONFIG[s].label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-700">
                      {
                        items.filter((i) => DISPLAY_STATUS(i.status) === s)
                          .length
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita — lista de cirurgias */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile: botão para abrir/fechar calendário */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowMobileCalendar((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-neutral-100 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-teal-600"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {showMobileCalendar
                    ? "Ocultar calendário"
                    : selectedDay
                      ? `Calendário · ${formatDateLong(selectedDay)}`
                      : `${MONTHS[calMonth]} ${calYear}`}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn(
                    "transition-transform duration-200",
                    showMobileCalendar ? "rotate-180" : "",
                  )}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showMobileCalendar && (
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                  <MiniCalendar
                    year={calYear}
                    month={calMonth}
                    dayEventMap={dayEventMap}
                    selectedDay={selectedDay}
                    onSelectDay={(day) => {
                      handleSelectDay(day);
                      setShowMobileCalendar(false);
                    }}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                  />
                </div>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loading size="md" />
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
                <p className="text-sm text-red-500 text-center">{error}</p>
                <button
                  onClick={load}
                  className="text-sm text-teal-600 hover:text-teal-800 underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !error && groupedByDate.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
                <Image
                  src="/icons/calendar-schedule.svg"
                  alt="Sem cirurgias"
                  width={40}
                  height={40}
                  className="opacity-30"
                />
                <p className="text-sm text-neutral-400 text-center">
                  {selectedDay
                    ? `Nenhuma cirurgia encontrada para ${formatDateLong(selectedDay)}.`
                    : statusFilter !== null
                      ? `Nenhuma cirurgia com status "${STATUS_CONFIG[statusFilter].label}" no momento.`
                      : "Nenhuma cirurgia agendada no momento."}
                </p>
                {(selectedDay || statusFilter !== null) && (
                  <button
                    onClick={() => {
                      setSelectedDay(null);
                      setStatusFilter(null);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800 underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {!loading && !error && groupedByDate.length > 0 && (
              <div className="px-4 lg:px-6 py-4 space-y-6">
                {groupedByDate.map(([dateKey, surgeries]) => {
                  const date = new Date(dateKey + "T00:00:00");
                  const todayKey = toLocalDateKey(new Date().toISOString());
                  const isToday = dateKey === todayKey;
                  const isPast = dateKey < todayKey;

                  return (
                    <div key={dateKey}>
                      {/* Cabeçalho do grupo */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0",
                            isToday
                              ? "bg-teal-600"
                              : isPast
                                ? "bg-neutral-100"
                                : "bg-teal-50",
                          )}
                        >
                          <span
                            className={cn(
                              "text-lg font-bold leading-none",
                              isToday
                                ? "text-white"
                                : isPast
                                  ? "text-neutral-500"
                                  : "text-teal-700",
                            )}
                          >
                            {date.getDate()}
                          </span>
                          <span
                            className={cn(
                              "text-xs leading-none mt-0.5",
                              isToday
                                ? "text-teal-100"
                                : isPast
                                  ? "text-neutral-400"
                                  : "text-teal-500",
                            )}
                          >
                            {MONTHS_SHORT[date.getMonth()]}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            {WEEKDAYS[date.getDay()]}, {date.getDate()} de{" "}
                            {MONTHS[date.getMonth()]} de {date.getFullYear()}
                            {isToday && (
                              <span className="ml-2 text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                Hoje
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {surgeries.length}{" "}
                            {surgeries.length === 1 ? "cirurgia" : "cirurgias"}
                          </p>
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2">
                        {surgeries.map((item) => (
                          <SurgeryCard
                            key={item.id}
                            item={item}
                            onClick={() =>
                              router.push(`/solicitacao/${item.id}`)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
