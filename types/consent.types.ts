/**
 * Tipos relacionados a consentimentos LGPD.
 * Mantém alinhamento com `inexci-api/src/modules/privacy/consent.service.ts`.
 *
 * Não há versionamento: cada consentimento é representado por um timestamp
 * de aceite (ou null se ainda não aceito).
 */

export type ConsentType = "privacy_policy" | "terms_of_use" | "ai";

export interface ConsentStatus {
  privacyPolicyAcceptedAt: string | null;
  termsOfUseAcceptedAt: string | null;
  aiConsentAcceptedAt: string | null;
  /** True quando Política e Termos foram aceitos. */
  requiredConsentsAccepted: boolean;
  /** Tipos obrigatórios ainda pendentes (subset de privacy_policy/terms_of_use). */
  pendingRequired: ConsentType[];
}

export interface LegalDocument {
  slug: string;
  type: ConsentType;
  content_md: string;
}

export const CONSENT_TYPE_LABELS: Record<
  ConsentType,
  { title: string; subtitle: string }
> = {
  privacy_policy: {
    title: "Política de Privacidade",
    subtitle: "Como tratamos seus dados pessoais",
  },
  terms_of_use: {
    title: "Termos de Uso",
    subtitle: "Regras de uso da plataforma",
  },
  ai: {
    title: "Assistente de Inteligência Artificial",
    subtitle: "Uso opcional do bot via WhatsApp",
  },
};

export const CONSENT_SLUG_BY_TYPE: Record<ConsentType, string> = {
  privacy_policy: "privacy-policy",
  terms_of_use: "terms-of-use",
  ai: "ai-disclosure",
};

export const CONSENT_TYPE_BY_SLUG: Record<string, ConsentType> = {
  "privacy-policy": "privacy_policy",
  "terms-of-use": "terms_of_use",
  "ai-disclosure": "ai",
};
