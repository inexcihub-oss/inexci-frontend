"use client";

import {
  CalendarDays,
  Check,
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

const TRAVADAS_PARA_PROFISSIONAL = [Permission.AGENDA, Permission.ATENDIMENTO];
const TRAVADAS_PARA_MEDICO = [
  ...TRAVADAS_PARA_PROFISSIONAL,
  Permission.SOLICITACOES,
];

const PERMISSION_ICONS: Record<Permission, LucideIcon> = {
  [Permission.AGENDA]: CalendarDays,
  [Permission.ATENDIMENTO]: Stethoscope,
  [Permission.SOLICITACOES]: LayoutGrid,
  [Permission.ADMINISTRACAO]: ShieldCheck,
};

interface Props {
  value: Permission[];
  isDoctor: boolean;
  isPhysician?: boolean;
  onChange: (permissions: Permission[]) => void;
}

export function PermissionsSection({
  value,
  isDoctor,
  isPhysician = true,
  onChange,
}: Props) {
  const fixas = !isDoctor
    ? []
    : isPhysician
      ? TRAVADAS_PARA_MEDICO
      : TRAVADAS_PARA_PROFISSIONAL;
  const efetivas = ALL_PERMISSIONS.filter(
    (p) => value.includes(p) || fixas.includes(p),
  );

  const travada = (p: Permission) => fixas.includes(p);

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
    const mantemAdmin = value.includes(Permission.ADMINISTRACAO)
      ? [Permission.ADMINISTRACAO]
      : [];
    onChange(
      ALL_PERMISSIONS.filter((p) => [...preset, ...mantemAdmin].includes(p)),
    );
  };

  return (
    <div data-tour="admin-areas" className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col">
        <label htmlFor="perfil-colaborador" className="ds-label">
          Perfil de acesso
        </label>
        <div className="relative w-full sm:max-w-sm">
          <select
            id="perfil-colaborador"
            value={presetFor(efetivas)}
            onChange={(e) => aplicarPreset(e.target.value)}
            className="ds-input"
          >
            {Object.entries(PROFILE_LABELS).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <p className="ds-caption mt-1.5">
          Escolha um perfil pronto ou marque as áreas uma a uma.
        </p>
      </div>

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
            {isPhysician
              ? "O médico sempre tem acesso a Agenda, Atendimento e Solicitações cirúrgicas: ele agenda a própria consulta, marca o atendimento como realizado e a ficha com indicação cirúrgica cria a solicitação em nome dele."
              : "O profissional sempre tem acesso a Agenda e Atendimento: ele agenda a própria consulta e registra o atendimento. Solicitações cirúrgicas são do médico (CRM) e só aparecem se marcadas abaixo."}
          </span>
        </p>
      )}
    </div>
  );
}
