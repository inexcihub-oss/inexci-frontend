"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { getApiErrorMessage } from "@/lib/http-error";
import { NATIONAL_FIXED_HOLIDAYS } from "@/lib/availability";
import {
  availabilityService,
  Holiday,
} from "@/services/availability.service";

interface Rascunho {
  id: string | null;
  name: string;
  date: string;
  recurring: boolean;
  blocksAgenda: boolean;
}

const dataBR = (d: string) => d.split("-").reverse().join("/");

/**
 * Feriados da conta (MIG-05). Feriado que bloqueia a agenda impede agendar no
 * dia; "repete todo ano" vale para os de data fixa. Os nacionais fixos podem
 * ser importados de uma vez; Carnaval, Sexta-feira Santa e Corpus Christi
 * mudam de data e são cadastrados por ano.
 */
export function HolidaysSettings() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [feriados, setFeriados] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [saving, setSaving] = useState(false);
  const [importando, setImportando] = useState(false);
  const [excluindo, setExcluindo] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setFeriados(await availabilityService.getHolidays(ano));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os feriados."));
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Ordena pelo dia/mês: os recorrentes de outros anos ficam no lugar certo. */
  const ordenados = [...feriados].sort((a, b) =>
    a.date.slice(5).localeCompare(b.date.slice(5)),
  );

  const salvar = async () => {
    if (!rascunho) return;
    if (!rascunho.name.trim() || !rascunho.date) {
      setError("Informe o nome e a data do feriado.");
      return;
    }
    setError(null);
    setSaving(true);
    const payload = {
      name: rascunho.name.trim(),
      date: rascunho.date,
      recurring: rascunho.recurring,
      blocksAgenda: rascunho.blocksAgenda,
    };
    try {
      if (rascunho.id) {
        await availabilityService.updateHoliday(rascunho.id, payload);
      } else {
        await availabilityService.createHoliday(payload);
      }
      setRascunho(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o feriado."));
    } finally {
      setSaving(false);
    }
  };

  /** Cria os nacionais fixos que ainda não existem (mesmo dia/mês). */
  const importarNacionais = async () => {
    setError(null);
    setImportando(true);
    try {
      const existentes = new Set(feriados.map((f) => f.date.slice(5)));
      for (const h of NATIONAL_FIXED_HOLIDAYS) {
        if (existentes.has(h.md)) continue;
        await availabilityService.createHoliday({
          name: h.name,
          date: `${ano}-${h.md}`,
          recurring: true,
          blocksAgenda: true,
        });
      }
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível importar os feriados."));
    } finally {
      setImportando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setDeleting(true);
    try {
      await availabilityService.deleteHoliday(excluindo.id);
      setExcluindo(null);
      await carregar();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover o feriado."));
      setExcluindo(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feriados</h2>
          <p className="text-sm text-gray-500 mt-1">
            Feriado que bloqueia a agenda impede marcar consultas no dia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Ano anterior"
            onClick={() => setAno((a) => a - 1)}
            className="px-3 rounded-lg border border-gray-200 min-h-[44px]"
          >
            ‹
          </button>
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">
            {ano}
          </span>
          <button
            type="button"
            aria-label="Próximo ano"
            onClick={() => setAno((a) => a + 1)}
            className="px-3 rounded-lg border border-gray-200 min-h-[44px]"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!rascunho && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => {
              setError(null);
              setRascunho({
                id: null,
                name: "",
                date: "",
                recurring: false,
                blocksAgenda: true,
              });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo feriado
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px]"
            disabled={importando}
            onClick={importarNacionais}
          >
            {importando ? "Importando..." : "Importar feriados nacionais"}
          </Button>
        </div>
      )}

      {rascunho && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="feriado-nome"
              label="Nome"
              value={rascunho.name}
              maxLength={100}
              onChange={(e) => setRascunho({ ...rascunho, name: e.target.value })}
            />
            <Input
              id="feriado-data"
              label="Data"
              type="date"
              value={rascunho.date}
              onChange={(e) => setRascunho({ ...rascunho, date: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-teal-600"
              checked={rascunho.recurring}
              onChange={(e) =>
                setRascunho({ ...rascunho, recurring: e.target.checked })
              }
            />
            Repete todo ano
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-teal-600"
              checked={rascunho.blocksAgenda}
              onChange={(e) =>
                setRascunho({ ...rascunho, blocksAgenda: e.target.checked })
              }
            />
            Bloqueia a agenda
          </label>
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
              {saving ? "Salvando..." : "Salvar feriado"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando feriados...</p>
      ) : ordenados.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum feriado em {ano}.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
          {ordenados.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarOff className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm tabular-nums text-gray-500 shrink-0">
                  {f.recurring ? dataBR(f.date).slice(0, 5) : dataBR(f.date)}
                </span>
                <span className="text-sm text-gray-800 truncate">{f.name}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {[f.recurring && "todo ano", !f.blocksAgenda && "não bloqueia"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Editar ${f.name}`}
                  onClick={() => {
                    setError(null);
                    setRascunho({
                      id: f.id,
                      name: f.name,
                      date: f.date,
                      recurring: f.recurring,
                      blocksAgenda: f.blocksAgenda,
                    });
                  }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${f.name}`}
                  onClick={() => setExcluindo(f)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteModal
        isOpen={excluindo !== null}
        title="Remover feriado"
        itemName={excluindo?.name}
        softDelete
        loading={deleting}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
