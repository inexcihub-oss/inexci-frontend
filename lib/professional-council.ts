/**
 * Conselho profissional — espelha `ProfessionalCouncil` do backend
 * (`inexci-api/src/database/entities/doctor-profile.entity.ts`).
 *
 * Só CRM é médico: indica cirurgia e enxerga Solicitações. Receita, atestado
 * e pedido de exame saem de médico (CRM) ou dentista (CRO). Os demais têm
 * agenda e prontuário próprios.
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
 * Registro para exibição: `CRM 12345/RJ`, `CRN 4567/RJ`; conselho "Outro" sai
 * como `Registro 123/RJ` (o valor cru do enum não é rótulo). Vazio quando não
 * há perfil ou não há número — a sigla sozinha ("CRM") vira subtítulo sem
 * informação, e é o que aparece para o próprio colaborador na lista de
 * acesso a médicos, que é montada sem registro.
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
  const numero = profile?.crm?.trim();
  if (!profile || !numero) return "";
  const conselho = councilOf(profile);
  const rotulo = conselho === "OUTRO" ? "Registro" : conselho;
  return `${rotulo} ${numero}${profile.crmState ? `/${profile.crmState}` : ""}`;
}

/** Conselhos que emitem receita, atestado e pedido de exame. */
export const CONSELHOS_QUE_EMITEM_DOCUMENTOS: readonly ProfessionalCouncil[] = [
  "CRM",
  "CRO",
];

/** Emite receita, atestado e pedido de exame (CRM ou CRO). */
export function emiteDocumentosClinicos(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): boolean {
  return (
    !!profile && CONSELHOS_QUE_EMITEM_DOCUMENTOS.includes(councilOf(profile))
  );
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
