// ─── Opções de Gênero ─────────────────────────────────────────────────────────

export const GENDER_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
];

// ─── Estados Brasileiros ──────────────────────────────────────────────────────

/** Lista dos UFs em ordem alfabética */
export const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

/** Mapa de UF → nome completo do estado */
export const STATE_NAMES: Record<BrazilianState, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

/**
 * Opções de estado com label = nome completo do estado.
 * Ideal para selects em formulários de endereço.
 */
export const STATE_OPTIONS = [
  { value: "", label: "Selecione" },
  ...BRAZILIAN_STATES.map((uf) => ({ value: uf, label: STATE_NAMES[uf] })),
];

/**
 * Opções de estado com label = UF (sigla).
 * Ideal para selects de UF do CRM e campos compactos.
 */
export const STATE_UF_OPTIONS = [
  { value: "", label: "UF" },
  ...BRAZILIAN_STATES.map((uf) => ({ value: uf, label: uf })),
];
