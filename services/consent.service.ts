import api from "@/lib/api";
import {
  CONSENT_SLUG_BY_TYPE,
  type ConsentStatus,
  type ConsentType,
  type LegalDocument,
} from "@/types/consent.types";

export type {
  ConsentStatus,
  ConsentType,
  LegalDocument,
} from "@/types/consent.types";

export const consentService = {
  async getStatus(): Promise<ConsentStatus> {
    const response = await api.get<ConsentStatus>("/privacy/consent/status");
    return response.data;
  },

  /** Aceita Política e Termos de Uso de uma só vez. */
  async acceptTerms(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/accept-terms",
    );
    return response.data;
  },

  /** Ativa o assistente de IA pelo WhatsApp. */
  async grantAi(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/grant-ai",
    );
    return response.data;
  },

  /** Desativa o assistente de IA pelo WhatsApp. */
  async revokeAi(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/revoke-ai",
    );
    return response.data;
  },

  /** Busca o documento legal atual a partir do tipo de consentimento. */
  async getDocument(type: ConsentType): Promise<LegalDocument> {
    return this.getDocumentBySlug(CONSENT_SLUG_BY_TYPE[type]);
  },

  /** Busca o documento legal atual a partir do slug — usado em rotas públicas. */
  async getDocumentBySlug(slug: string): Promise<LegalDocument> {
    const response = await api.get<LegalDocument>(`/privacy/policy/${slug}`);
    return response.data;
  },
};
