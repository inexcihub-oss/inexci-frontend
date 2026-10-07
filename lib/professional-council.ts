/**
 * Conselho profissional — espelha `ProfessionalCouncil` do backend
 * (`inexci-api/src/database/entities/doctor-profile.entity.ts`).
 *
 * Só CRM é médico: emite receita, atestado e pedido de exame, indica cirurgia
 * e enxerga Solicitações. Os demais têm agenda e prontuário próprios.
 */
export type ProfessionalCouncil =
  | "CRM"
  | "CRP"
  | "CRN"
  | "COREN"
  | "CREFITO"
  | "CRFA"
  | "CRO"
  | "CRBM"
  | "CREF"
  | "OUTRO";

export const COUNCIL_OPTIONS: { value: ProfessionalCouncil; label: string }[] =
  [
    { value: "CRM", label: "CRM — Medicina" },
    { value: "CRP", label: "CRP — Psicologia" },
    { value: "CRN", label: "CRN — Nutrição" },
    { value: "COREN", label: "COREN — Enfermagem" },
    { value: "CREFITO", label: "CREFITO — Fisioterapia e T.O." },
    { value: "CRFA", label: "CRFa — Fonoaudiologia" },
    { value: "CRO", label: "CRO — Odontologia" },
    { value: "CRBM", label: "CRBM — Biomedicina" },
    { value: "CREF", label: "CREF — Educação física" },
    { value: "OUTRO", label: "Outro" },
  ];

/** Perfil sem `council` (resposta antiga) é CRM — era o único que existia. */
export function councilOf(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): ProfessionalCouncil {
  return (profile?.council as ProfessionalCouncil) || "CRM";
}

/**
 * Registro para exibição: `CRM 12345/RJ`, `CRN 4567/RJ` ou só `CRP` quando o
 * profissional não tem número cadastrado. Vazio quando não há perfil.
 */
export function formatRegistration(
  profile:
    | {
        council?: ProfessionalCouncil | string | null;
        crm?: string | null;
        crmState?: string | null;
      }
    | null
    | undefined,
): string {
  if (!profile) return "";
  const conselho = councilOf(profile);
  if (!profile.crm) return conselho === "OUTRO" ? "" : conselho;
  return `${conselho} ${profile.crm}${profile.crmState ? `/${profile.crmState}` : ""}`;
}

/**
 * Pode ser o médico de uma Solicitação Cirúrgica (CRM). `isPhysician` ausente
 * vem de resposta anterior ao conselho, quando todo perfil era médico.
 */
export function canOwnSurgeryRequest(doctor: {
  isPhysician?: boolean;
}): boolean {
  return doctor.isPhysician !== false;
}

/**
 * Rótulo curto do tipo de profissional para listas: "Médico" só para CRM;
 * os demais pela área do conselho ("Nutrição", "Psicologia"…); sem conselho
 * definido, "Profissional".
 */
export function professionalKindLabel(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): string {
  const conselho = councilOf(profile);
  if (conselho === "CRM") return "Médico";
  if (conselho === "OUTRO") return "Profissional";
  const opcao = COUNCIL_OPTIONS.find((o) => o.value === conselho);
  return opcao ? opcao.label.split(" — ")[1] : "Profissional";
}
