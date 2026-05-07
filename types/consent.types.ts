/**
 * Tipos relacionados a consentimentos LGPD.
 * Mantém alinhamento com `inexci-api/src/database/entities/consent-log.entity.ts`
 * e `inexci-api/src/modules/privacy/consent.service.ts`.
 */

export type ConsentType = "privacy_policy" | "terms_of_use" | "ai";

export type ConsentAction = "granted" | "revoked";

export type ConsentChannel = "web" | "mobile" | "api" | "admin";

export interface ConsentStatus {
  type: ConsentType;
  isAccepted: boolean;
  isRequired: boolean;
  acceptedVersion: string | null;
  currentVersion: string;
  acceptedAt: string | null;
}

export interface ConsentLogEntry {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  version: string;
  action: ConsentAction;
  ip_address: string | null;
  user_agent: string | null;
  channel: ConsentChannel;
  created_at: string;
}

export interface LegalDocument {
  slug: string;
  type: ConsentType;
  version: string;
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
