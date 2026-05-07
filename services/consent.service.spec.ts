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
      const mock = [
        {
          type: "privacy_policy",
          isAccepted: true,
          isRequired: true,
          acceptedVersion: "1.0",
          currentVersion: "1.0",
          acceptedAt: "2026-05-07T00:00:00Z",
        },
      ];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mock });
      const r = await consentService.getStatus();
      expect(api.get).toHaveBeenCalledWith("/privacy/consent/status");
      expect(r).toEqual(mock);
    });
  });

  describe("grant", () => {
    it("envia type e version no POST /privacy/consent/grant", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { type: "ai", isAccepted: true, currentVersion: "1.0" },
      });
      const r = await consentService.grant("ai", "1.0");
      expect(api.post).toHaveBeenCalledWith("/privacy/consent/grant", {
        type: "ai",
        version: "1.0",
      });
      expect(r.isAccepted).toBe(true);
    });
  });

  describe("revoke", () => {
    it("envia somente type no POST /privacy/consent/revoke", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { type: "ai", isAccepted: false },
      });
      await consentService.revoke("ai");
      expect(api.post).toHaveBeenCalledWith("/privacy/consent/revoke", {
        type: "ai",
      });
    });
  });

  describe("getHistory", () => {
    it("inclui filtros type e limit na URL", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      await consentService.getHistory("ai", 5);
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain("/privacy/consent/history");
      expect(url).toContain("type=ai");
      expect(url).toContain("limit=5");
    });

    it("usa limit default 50 quando omitido", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      await consentService.getHistory();
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain("limit=50");
      expect(url).not.toContain("type=");
    });
  });

  describe("getDocument", () => {
    it("mapeia 'privacy_policy' para slug 'privacy-policy'", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          slug: "privacy-policy",
          type: "privacy_policy",
          version: "1.0",
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
