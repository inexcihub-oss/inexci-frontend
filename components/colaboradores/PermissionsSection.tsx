"use client";

import {
  ALL_PERMISSIONS,
  Permission,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  PROFILE_LABELS,
  PROFILE_PRESETS,
  presetFor,
} from "@/lib/permissions";

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="perfil-colaborador"
          className="text-xs md:text-sm font-semibold text-neutral-900"
        >
          Perfil de acesso
        </label>
        <select
          id="perfil-colaborador"
          value={presetFor(efetivas)}
          onChange={(e) => aplicarPreset(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm min-h-[44px]"
        >
          {Object.entries(PROFILE_LABELS).map(([chave, rotulo]) => (
            <option key={chave} value={chave}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Permissões</legend>
        {ALL_PERMISSIONS.map((p) => (
          <label
            key={p}
            className="flex items-start gap-3 rounded-xl border border-neutral-100 px-3 py-2.5"
          >
            <input
              type="checkbox"
              checked={efetivas.includes(p)}
              disabled={travada(p)}
              onChange={() => alternar(p)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-teal-500"
            />
            <span className="min-w-0">
              <span className="block text-xs md:text-sm font-semibold text-neutral-900">
                {PERMISSION_LABELS[p]}
              </span>
              <span className="block text-[11px] leading-tight text-neutral-500">
                {PERMISSION_DESCRIPTIONS[p]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {isDoctor && (
        <p className="text-[11px] leading-tight text-teal-600">
          O médico sempre tem acesso a Agenda, Atendimento e Solicitações
          cirúrgicas: ele agenda a própria consulta, marca o atendimento como
          realizado e finalizar uma ficha com indicação cirúrgica cria a
          solicitação em nome dele.
        </p>
      )}
    </div>
  );
}
