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

  async acceptTerms(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/accept-terms",
    );
    return response.data;
  },

  async grantAi(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/grant-ai",
    );
    return response.data;
  },

  async revokeAi(): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>(
      "/privacy/consent/revoke-ai",
    );
    return response.data;
  },

  async getDocument(type: ConsentType): Promise<LegalDocument> {
    return this.getDocumentBySlug(CONSENT_SLUG_BY_TYPE[type]);
  },

  async getDocumentBySlug(slug: string): Promise<LegalDocument> {
    const response = await api.get<LegalDocument>(`/privacy/policy/${slug}`);
    return response.data;
  },
};
