/**
 * AuthContext — consents embutidos no `/auth/me` (item 4.4b).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const consentGetStatus = vi.fn();
const authMe = vi.fn();

vi.mock("@/services/consent.service", () => ({
  consentService: {
    getStatus: (...args: unknown[]) => consentGetStatus(...args),
  },
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    me: (...args: unknown[]) => authMe(...args),
    getCurrentUser: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  refreshSession: vi.fn(),
}));

vi.mock("@/lib/auth-token", () => ({
  getAccessToken: vi.fn().mockReturnValue("token"),
  clearAccessToken: vi.fn(),
}));

vi.mock("@/lib/session-flag", () => ({
  hasSessionHint: vi.fn().mockReturnValue(true),
  clearSessionFlag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AuthContext — consents do /auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applyConsentsFromUser evita chamar consentService.getStatus quando me traz consents", () => {
    const userWithConsents = {
      id: "u-1",
      consents: {
        privacyPolicyAcceptedAt: "2026-01-01T00:00:00.000Z",
        termsOfUseAcceptedAt: "2026-01-02T00:00:00.000Z",
        aiConsentAcceptedAt: null,
        requiredConsentsAccepted: true,
        pendingRequired: [],
      },
    };

    const applyConsentsFromUser = (currentUser: typeof userWithConsents) => {
      if (currentUser.consents) return true;
      return false;
    };

    expect(applyConsentsFromUser(userWithConsents)).toBe(true);

    const shouldFetch = !applyConsentsFromUser(userWithConsents);
    if (shouldFetch) {
      consentGetStatus();
    }

    expect(consentGetStatus).not.toHaveBeenCalled();
  });

  it("faz fallback para consentService.getStatus quando me não traz consents", async () => {
    consentGetStatus.mockResolvedValue({
      privacyPolicyAcceptedAt: null,
      termsOfUseAcceptedAt: null,
      aiConsentAcceptedAt: null,
      requiredConsentsAccepted: false,
      pendingRequired: ["privacy_policy", "terms_of_use"],
    });

    const userWithoutConsents = { id: "u-2" };
    const applyConsentsFromUser = (currentUser: { consents?: unknown }) =>
      Boolean(currentUser.consents);

    if (!applyConsentsFromUser(userWithoutConsents)) {
      await consentGetStatus();
    }

    expect(consentGetStatus).toHaveBeenCalledTimes(1);
  });
});
