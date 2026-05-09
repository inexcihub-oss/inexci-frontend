import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from "@/lib/api";
import { consentService } from "./consent.service";

describe("consentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStatus", () => {
    it("chama GET /privacy/consent/status", async () => {
      const mock = {
        privacyPolicyAcceptedAt: "2026-05-07T00:00:00Z",
        termsOfUseAcceptedAt: "2026-05-07T00:00:00Z",
        aiConsentAcceptedAt: null,
        requiredConsentsAccepted: true,
        pendingRequired: [],
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mock });
      const r = await consentService.getStatus();
      expect(api.get).toHaveBeenCalledWith("/privacy/consent/status");
      expect(r).toEqual(mock);
    });
  });

  describe("acceptTerms", () => {
    it("chama POST /privacy/consent/accept-terms", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          privacyPolicyAcceptedAt: "2026-05-07T00:00:00Z",
          termsOfUseAcceptedAt: "2026-05-07T00:00:00Z",
          aiConsentAcceptedAt: null,
          requiredConsentsAccepted: true,
          pendingRequired: [],
        },
      });
      const r = await consentService.acceptTerms();
      expect(api.post).toHaveBeenCalledWith("/privacy/consent/accept-terms");
      expect(r.requiredConsentsAccepted).toBe(true);
    });
  });

  describe("grantAi / revokeAi", () => {
    it("grantAi chama POST /privacy/consent/grant-ai", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { aiConsentAcceptedAt: "2026-05-07T00:00:00Z" },
      });
      await consentService.grantAi();
      expect(api.post).toHaveBeenCalledWith("/privacy/consent/grant-ai");
    });

    it("revokeAi chama POST /privacy/consent/revoke-ai", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { aiConsentAcceptedAt: null },
      });
      await consentService.revokeAi();
      expect(api.post).toHaveBeenCalledWith("/privacy/consent/revoke-ai");
    });
  });

  describe("getDocument", () => {
    it("mapeia 'privacy_policy' para slug 'privacy-policy'", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          slug: "privacy-policy",
          type: "privacy_policy",
          content_md: "## Test",
        },
      });
      await consentService.getDocument("privacy_policy");
      expect(api.get).toHaveBeenCalledWith("/privacy/policy/privacy-policy");
    });

    it("mapeia 'terms_of_use' para slug 'terms-of-use'", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { slug: "terms-of-use" },
      });
      await consentService.getDocument("terms_of_use");
      expect(api.get).toHaveBeenCalledWith("/privacy/policy/terms-of-use");
    });

    it("mapeia 'ai' para slug 'ai-disclosure'", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { slug: "ai-disclosure" },
      });
      await consentService.getDocument("ai");
      expect(api.get).toHaveBeenCalledWith("/privacy/policy/ai-disclosure");
    });
  });

  describe("getDocumentBySlug", () => {
    it("aceita slug arbitrário e chama o endpoint", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { slug: "ai-disclosure" },
      });
      await consentService.getDocumentBySlug("ai-disclosure");
      expect(api.get).toHaveBeenCalledWith("/privacy/policy/ai-disclosure");
    });
  });
});
