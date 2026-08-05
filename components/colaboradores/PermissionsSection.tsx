"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Info,
  LayoutGrid,
  LucideIcon,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import {
  ALL_PERMISSIONS,
  Permission,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  PROFILE_LABELS,
  PROFILE_PRESETS,
  presetFor,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Áreas que todo médico tem por definição — ver `resolveEffectivePermissions`
 * no backend (`inexci-api/src/shared/permissions/resolve-permissions.ts`).
 * O médico agenda a própria consulta, marca o atendimento como realizado e
 * agenda o retorno a partir da ficha do paciente (sem Agenda ele não
 * conseguiria atender); e finalizar uma ficha com indicação cirúrgica abre a
 * SC — um médico sem Atendimento/Solicitações criaria uma solicitação
 * invisível para si mesmo.
 */
const TRAVADAS_PARA_MEDICO = [
  Permission.AGENDA,
  Permission.ATENDIMENTO,
  Permission.SOLICITACOES,
];

/** Mesma iconografia do menu lateral, para a área ser reconhecida de imediato. */
const PERMISSION_ICONS: Record<Permission, LucideIcon> = {
  [Permission.AGENDA]: CalendarDays,
  [Permission.ATENDIMENTO]: Stethoscope,
  [Permission.SOLICITACOES]: LayoutGrid,
  [Permission.ADMINISTRACAO]: ShieldCheck,
};

interface Props {
  value: Permission[];
  isDoctor: boolean;
  onChange: (permissions: Permission[]) => void;
}

export function PermissionsSection({ value, isDoctor, onChange }: Props) {
  const efetivas = isDoctor
    ? ALL_PERMISSIONS.filter(
        (p) => value.includes(p) || TRAVADAS_PARA_MEDICO.includes(p),
      )
    : value;

  const travada = (p: Permission) =>
    isDoctor && TRAVADAS_PARA_MEDICO.includes(p);

  const alternar = (p: Permission) => {
    if (travada(p)) return;
    const proximo = value.includes(p)
      ? value.filter((atual) => atual !== p)
      : [...value, p];
    onChange(ALL_PERMISSIONS.filter((atual) => proximo.includes(atual)));
  };

  const aplicarPreset = (chave: string) => {
    if (chave === "personalizado") return;
    const preset = PROFILE_PRESETS[chave] ?? [];
    // Administração é concessão consciente: o preset não tira nem põe.
    const mantemAdmin = value.includes(Permission.ADMINISTRACAO)
      ? [Permission.ADMINISTRACAO]
      : [];
    onChange(
      ALL_PERMISSIONS.filter((p) => [...preset, ...mantemAdmin].includes(p)),
    );
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Perfil pronto */}
      <div className="flex flex-col">
        <label htmlFor="perfil-colaborador" className="ds-label">
          Perfil de acesso
        </label>
        <div className="relative w-full sm:max-w-sm">
          <select
            id="perfil-colaborador"
            value={presetFor(efetivas)}
            onChange={(e) => aplicarPreset(e.target.value)}
            className="ds-input appearance-none pr-9"
          >
            {Object.entries(PROFILE_LABELS).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        <p className="ds-caption mt-1.5">
          Escolha um perfil pronto ou marque as áreas uma a uma.
        </p>
      </div>

      {/* Áreas */}
      <fieldset className="flex flex-col gap-2">
        <legend className="ds-label">Áreas liberadas</legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
          {ALL_PERMISSIONS.map((p) => {
            const marcada = efetivas.includes(p);
            const fixa = travada(p);
            const Icone = PERMISSION_ICONS[p];

            return (
              <label
                key={p}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors duration-200 md:p-3.5",
                  fixa
                    ? "cursor-default border-neutral-100 bg-gray-50"
                    : "cursor-pointer",
                  !fixa && marcada
                    ? "border-primary-500 bg-primary-50/50 hover:bg-primary-50"
                    : "",
                  !fixa && !marcada
                    ? "border-neutral-100 bg-white hover:border-primary-200 hover:bg-gray-50"
                    : "",
                )}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  disabled={fixa}
                  onChange={() => alternar(p)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors duration-200",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
                    marcada
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-gray-400 bg-white",
                    fixa && "opacity-60",
                  )}
                >
                  {marcada && <Check className="h-3 w-3 stroke-[3]" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <Icone
                      className={cn(
                        "h-4 w-4 shrink-0",
                        marcada ? "text-primary-600" : "text-gray-400",
                      )}
                    />
                    <span className="ds-section-title truncate">
                      {PERMISSION_LABELS[p]}
                    </span>
                    {fixa && (
                      <span className="ml-auto shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                        Fixa
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-gray-500">
                    {PERMISSION_DESCRIPTIONS[p]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {isDoctor && (
        <p className="flex items-start gap-2 rounded-xl bg-primary-50/60 px-3 py-2.5 text-xs leading-snug text-primary-800">
          <Info className="mt-px h-4 w-4 shrink-0" />
          <span>
            O médico sempre tem acesso a Agenda, Atendimento e Solicitações
            cirúrgicas: ele agenda a própria consulta, marca o atendimento como
            realizado e a ficha com indicação cirúrgica cria a solicitação em
            nome dele.
          </span>
        </p>
      )}
    </div>
  );
}
