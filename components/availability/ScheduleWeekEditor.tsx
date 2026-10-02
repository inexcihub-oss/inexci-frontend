"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { useClinics } from "@/hooks/useClinics";
import { useClinicRooms } from "@/hooks/useClinicRooms";
import { getApiErrorMessage } from "@/lib/http-error";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/availability";
import {
  availabilityService,
  DoctorSchedule,
  DoctorSchedulePayload,
} from "@/services/availability.service";

const SLOT_OPTIONS = [10, 15, 20, 30, 40, 45, 60, 90];

interface Rascunho {
  id: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  clinicId: string;
  roomId: string;
  validFrom: string;
  validTo: string;
  maxWalkIns: string;
}

const novoRascunho = (weekday = 1): Rascunho => ({
  id: null,
  weekday,
  startTime: "08:00",
  endTime: "12:00",
  slotMinutes: 30,
  clinicId: "",
  roomId: "",
  validFrom: "",
  validTo: "",
  maxWalkIns: "",
});

const hhmm = (t: string) => t.slice(0, 5);
const dataBR = (d: string) => d.split("-").reverse().join("/");

/**
 * Grade semanal de atendimento de um profissional (MIG-05): períodos por dia
 * da semana, com intervalo entre horários, clínica/sala e vigência. A grade
 * só orienta a agenda (horários livres e aviso de "fora da grade"); quem
 * impede agendar são os bloqueios e feriados.
 */
export function ScheduleWeekEditor({
  doctorId,
  canEdit = true,
}: {
  doctorId: string;
  canEdit?: boolean;
}) {
  const [grades, setGrades] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<DoctorSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data: clinics = [] } = useClinics();
  const { data: rooms = [] } = useClinicRooms(rascunho?.clinicId || null);

  const carregar = useCallback(async () => {
    try {
      setGrades(await availabilityService.getSchedules(doctorId));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar a grade."));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const editar = (g: DoctorSchedule) => {
    setError(null);
    setRascunho({
      id: g.id,
      weekday: g.weekday,
      startTime: hhmm(g.startTime),
      endTime: hhmm(g.endTime),
      slotMinutes: g.slotMinutes,
      clinicId: g.clinicId ?? "",
      roomId: g.roomId ?? "",
      validFrom: g.validFrom ?? "",
      validTo: g.validTo ?? "",
      maxWalkIns: g.maxWalkIns != null ? String(g.maxWalkIns) : "",
    });
  };

  const salvar = async () => {
    if (!rascunho) return;
    if (rascunho.startTime >= rascunho.endTime) {
      setError("O início deve ser antes do fim.");
      return;
    }
    setError(null);
    setSaving(true);
    const payload: DoctorSchedulePayload = {
      weekday: rascunho.weekday,
      startTime: rascunho.startTime,
      endTime: rascunho.endTime,
      slotMinutes: rascunho.slotMinutes,
      clinicId: rascunho.clinicId || null,
      roomId: rascunho.roomId || null,
      validFrom: rascunho.validFrom || null,
      validTo: rascunho.validTo || null,
      maxWalkIns: rascunho.maxWalkIns ? Number(rascunho.maxWalkIns) : null,
    };
    try {
      if (rascunho.id) {
        await availabilityService.updateSchedule(rascunho.id, payload);
      } else {
        await availabilityService.createSchedule({ ...payload, doctorId });
      }
      setRascunho(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o período."));
    } finally {
      setSaving(false);
    }
  };

  const alternarAtivo = async (g: DoctorSchedule) => {
    setError(null);
    try {
      await availabilityService.updateSchedule(g.id, { active: !g.active });
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível alterar o período."));
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setDeleting(true);
    try {
      await availabilityService.deleteSchedule(excluindo.id);
      setExcluindo(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover o período."));
      setExcluindo(null);
    } finally {
      setDeleting(false);
    }
  };

  const set = (patch: Partial<Rascunho>) =>
    setRascunho((r) => (r ? { ...r, ...patch } : r));

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando grade...</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
          {WEEKDAY_ORDER.map((dia) => {
            const doDia = grades.filter((g) => g.weekday === dia);
            return (
              <li key={dia} className="flex flex-col sm:flex-row gap-2 px-3 py-2.5">
                <span className="w-24 shrink-0 text-sm font-semibold text-gray-700">
                  {WEEKDAY_LABELS[dia]}
                </span>
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  {doDia.length === 0 && (
                    <span className="text-sm text-gray-400">Não atende</span>
                  )}
                  {doDia.map((g) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span
                        className={
                          g.active
                            ? "font-medium text-gray-800 tabular-nums"
                            : "text-gray-400 line-through tabular-nums"
                        }
                      >
                        {hhmm(g.startTime)}–{hhmm(g.endTime)}
                      </span>
                      <span className="text-xs text-gray-500">
                        a cada {g.slotMinutes} min
                        {g.room?.name
                          ? ` · ${g.room.name}`
                          : g.clinic?.name
                            ? ` · ${g.clinic.name}`
                            : ""}
                        {g.validFrom || g.validTo
                          ? ` · ${g.validFrom ? `de ${dataBR(g.validFrom)}` : ""}${g.validTo ? ` até ${dataBR(g.validTo)}` : ""}`
                          : ""}
                        {!g.active ? " · inativo" : ""}
                      </span>
                      {canEdit && (
                        <span className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => alternarAtivo(g)}
                            className="px-2 text-xs font-medium text-gray-500 hover:text-gray-800 min-h-[36px]"
                          >
                            {g.active ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            aria-label={`Editar ${WEEKDAY_LABELS[dia]} ${hhmm(g.startTime)}`}
                            onClick={() => editar(g)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover ${WEEKDAY_LABELS[dia]} ${hhmm(g.startTime)}`}
                            onClick={() => setExcluindo(g)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && !rascunho && (
        <Button
          variant="outline"
          className="self-start min-h-[44px]"
          onClick={() => {
            setError(null);
            setRascunho(novoRascunho());
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar período
        </Button>
      )}

      {rascunho && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Campo id="grade-dia" label="Dia">
              <select
                id="grade-dia"
                className="ds-input"
                value={rascunho.weekday}
                onChange={(e) => set({ weekday: Number(e.target.value) })}
              >
                {WEEKDAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="grade-inicio" label="Início">
              <input
                id="grade-inicio"
                type="time"
                className="ds-input"
                value={rascunho.startTime}
                onChange={(e) => set({ startTime: e.target.value })}
              />
            </Campo>
            <Campo id="grade-fim" label="Fim">
              <input
                id="grade-fim"
                type="time"
                className="ds-input"
                value={rascunho.endTime}
                onChange={(e) => set({ endTime: e.target.value })}
              />
            </Campo>
            <Campo id="grade-intervalo" label="Intervalo">
              <select
                id="grade-intervalo"
                className="ds-input"
                value={rascunho.slotMinutes}
                onChange={(e) => set({ slotMinutes: Number(e.target.value) })}
              >
                {SLOT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo id="grade-clinica" label="Clínica (opcional)">
              <select
                id="grade-clinica"
                className="ds-input"
                value={rascunho.clinicId}
                onChange={(e) => set({ clinicId: e.target.value, roomId: "" })}
              >
                <option value="">Qualquer</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Campo>
            {rascunho.clinicId && rooms.length > 0 && (
              <Campo id="grade-sala" label="Sala (opcional)">
                <select
                  id="grade-sala"
                  className="ds-input"
                  value={rascunho.roomId}
                  onChange={(e) => set({ roomId: e.target.value })}
                >
                  <option value="">Qualquer</option>
                  {rooms
                    .filter((r) => r.active || r.id === rascunho.roomId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Campo>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo id="grade-de" label="Vale a partir de">
              <input
                id="grade-de"
                type="date"
                className="ds-input"
                value={rascunho.validFrom}
                onChange={(e) => set({ validFrom: e.target.value })}
              />
            </Campo>
            <Campo id="grade-ate" label="Vale até">
              <input
                id="grade-ate"
                type="date"
                className="ds-input"
                value={rascunho.validTo}
                onChange={(e) => set({ validTo: e.target.value })}
              />
            </Campo>
            <Campo id="grade-encaixes" label="Máx. encaixes">
              <input
                id="grade-encaixes"
                type="number"
                min={0}
                max={50}
                className="ds-input"
                value={rascunho.maxWalkIns}
                onChange={(e) => set({ maxWalkIns: e.target.value })}
              />
            </Campo>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={saving}
              onClick={() => {
                setRascunho(null);
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button className="min-h-[44px]" disabled={saving} onClick={salvar}>
              {saving ? "Salvando..." : "Salvar período"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={excluindo !== null}
        title="Remover período"
        itemName={
          excluindo
            ? `${WEEKDAY_LABELS[excluindo.weekday]} ${hhmm(excluindo.startTime)}–${hhmm(excluindo.endTime)}`
            : undefined
        }
        loading={deleting}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}

function Campo({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="ds-label mb-0">
        {label}
      </label>
      {children}
    </div>
  );
}
