import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "@/lib/api";
import { patientDocumentService } from "./document.service";

describe("patientDocumentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list envia patientId como query", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: "d1", name: "Exame" }],
    });

    const result = await patientDocumentService.list("p1");

    expect(api.get).toHaveBeenCalledWith("/clinical-records/documents", {
      params: { patientId: "p1" },
    });
    expect(result).toHaveLength(1);
  });

  it("upload monta o FormData com patientId, clinicalRecordId e folder", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: "d1" },
    });

    await patientDocumentService.upload({
      patientId: "p1",
      clinicalRecordId: "rec1",
      type: "exam_report",
      key: "exam_report",
      name: "Ressonância",
      file: new File(["x"], "exame.pdf"),
    });

    const [url, body] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/clinical-records/documents");
    const fd = body as FormData;
    expect(fd.get("patientId")).toBe("p1");
    expect(fd.get("clinicalRecordId")).toBe("rec1");
    expect(fd.get("type")).toBe("exam_report");
    expect(fd.get("name")).toBe("Ressonância");
    expect(fd.get("folder")).toBe("documents");
  });

  it("delete envia id e key no corpo", async () => {
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    await patientDocumentService.delete({ id: "d1", key: "k" });

    expect(api.delete).toHaveBeenCalledWith("/clinical-records/documents", {
      data: { id: "d1", key: "k" },
    });
  });
});
