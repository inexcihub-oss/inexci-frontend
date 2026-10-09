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

export function councilOf(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): ProfessionalCouncil {
  return (profile?.council as ProfessionalCouncil) || "CRM";
}

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

export const CONSELHOS_QUE_EMITEM_DOCUMENTOS: readonly ProfessionalCouncil[] = [
  "CRM",
  "CRO",
];

export function emiteDocumentosClinicos(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): boolean {
  return (
    !!profile && CONSELHOS_QUE_EMITEM_DOCUMENTOS.includes(councilOf(profile))
  );
}

export function canOwnSurgeryRequest(doctor: {
  isPhysician?: boolean;
}): boolean {
  return doctor.isPhysician !== false;
}

export function professionalKindLabel(
  profile: { council?: ProfessionalCouncil | string | null } | null | undefined,
): string {
  const conselho = councilOf(profile);
  if (conselho === "CRM") return "Médico";
  if (conselho === "OUTRO") return "Profissional";
  const opcao = COUNCIL_OPTIONS.find((o) => o.value === conselho);
  return opcao ? opcao.label.split(" — ")[1] : "Profissional";
}
