import { describe, it, expect } from "vitest";
import {
  CONSENT_SLUG_BY_TYPE,
  CONSENT_TYPE_BY_SLUG,
  CONSENT_TYPE_LABELS,
} from "../consent.types";

describe("consent.types", () => {
  it("CONSENT_SLUG_BY_TYPE cobre os três tipos", () => {
    expect(CONSENT_SLUG_BY_TYPE.privacy_policy).toBe("privacy-policy");
    expect(CONSENT_SLUG_BY_TYPE.terms_of_use).toBe("terms-of-use");
    expect(CONSENT_SLUG_BY_TYPE.ai).toBe("ai-disclosure");
  });

  it("CONSENT_TYPE_BY_SLUG é o inverso de CONSENT_SLUG_BY_TYPE", () => {
    for (const [type, slug] of Object.entries(CONSENT_SLUG_BY_TYPE)) {
      expect(CONSENT_TYPE_BY_SLUG[slug]).toBe(type);
    }
  });

  it("CONSENT_TYPE_LABELS tem título e subtítulo para cada tipo", () => {
    for (const t of ["privacy_policy", "terms_of_use", "ai"] as const) {
      expect(CONSENT_TYPE_LABELS[t]).toBeDefined();
      expect(CONSENT_TYPE_LABELS[t].title).toBeTruthy();
      expect(CONSENT_TYPE_LABELS[t].subtitle).toBeTruthy();
    }
  });
});
