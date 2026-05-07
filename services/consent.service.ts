import api from "@/lib/api";
import {
  CONSENT_SLUG_BY_TYPE,
  type ConsentLogEntry,
  type ConsentStatus,
  type ConsentType,
  type LegalDocument,
} from "@/types/consent.types";

export type {
  ConsentAction,
  ConsentLogEntry,
  ConsentStatus,
  ConsentType,
  LegalDocument,
} from "@/types/consent.types";

export const consentService = {
  async getStatus(): Promise<ConsentStatus[]> {
    const response = await api.get<ConsentStatus[]>("/privacy/consent/status");
    return response.data;
  },

  async grant(type: ConsentType, version: string): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>("/privacy/consent/grant", {
      type,
      version,
    });
    return response.data;
  },

  async revoke(type: ConsentType): Promise<ConsentStatus> {
    const response = await api.post<ConsentStatus>("/privacy/consent/revoke", {
      type,
    });
    return response.data;
  },

  async getHistory(
    type?: ConsentType,
    limit = 50,
  ): Promise<ConsentLogEntry[]> {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    params.append("limit", String(limit));
    const response = await api.get<ConsentLogEntry[]>(
      `/privacy/consent/history?${params.toString()}`,
    );
    return response.data;
  },

  /** Busca o documento legal atual a partir do tipo de consentimento. */
  async getDocument(type: ConsentType): Promise<LegalDocument> {
    const slug = CONSENT_SLUG_BY_TYPE[type];
    return this.getDocumentBySlug(slug);
  },

  /** Busca o documento legal atual a partir do slug — usado em rotas públicas. */
  async getDocumentBySlug(slug: string): Promise<LegalDocument> {
    const response = await api.get<LegalDocument>(`/privacy/policy/${slug}`);
    return response.data;
  },
};
