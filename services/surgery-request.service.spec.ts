import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { surgeryRequestService } from "./surgery-request.service";

describe("surgeryRequestService — PDF downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("downloadReportPdf", () => {
    it("deve chamar GET /surgery-requests/:id/report-pdf com responseType arraybuffer", async () => {
      const mockData = new ArrayBuffer(8);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await surgeryRequestService.downloadReportPdf("123");

      expect(api.get).toHaveBeenCalledWith("/surgery-requests/123/report-pdf", {
        responseType: "arraybuffer",
      });
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/pdf");
    });
  });

  describe("downloadContestAuthorizationPdf", () => {
    it("deve chamar GET /surgery-requests/:id/contest-authorization-pdf", async () => {
      const mockData = new ArrayBuffer(8);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result =
        await surgeryRequestService.downloadContestAuthorizationPdf("456");

      expect(api.get).toHaveBeenCalledWith(
        "/surgery-requests/456/contest-authorization-pdf",
        { responseType: "arraybuffer" },
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/pdf");
    });
  });
});
