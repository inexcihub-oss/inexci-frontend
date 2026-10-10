import { describe, it, expect } from "vitest";
import { surgeryRequestListName } from "@/lib/surgery-request-list";

describe("surgeryRequestListName", () => {
  it("indicação vinda do prontuário usa o nome livre (campos camelCase da API)", () => {
    expect(
      surgeryRequestListName({
        isIndication: true,
        indicationName: "Artroscopia indicada",
        procedure: { id: "p", name: "Catálogo" },
      }),
    ).toBe("Artroscopia indicada");
  });

  it("SC comum usa o procedimento do catálogo", () => {
    expect(
      surgeryRequestListName({
        isIndication: false,
        indicationName: null,
        procedure: { id: "p", name: "Artroplastia" },
      }),
    ).toBe("Artroplastia");
  });

  it("sem procedimento cai no nome da indicação e depois no fallback", () => {
    expect(
      surgeryRequestListName({ indicationName: "Livre", procedure: null }),
    ).toBe("Livre");
    expect(surgeryRequestListName({ procedure: null }, "—")).toBe("—");
  });
});
