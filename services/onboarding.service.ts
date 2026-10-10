import api from "@/lib/api";
import type {
  OnboardingState,
  OnboardingWritablePatch,
} from "@/lib/onboarding/state";

export const onboardingService = {
  async patch(patch: OnboardingWritablePatch): Promise<OnboardingState> {
    const response = await api.patch<OnboardingState>(
      "/onboarding/state",
      patch,
    );
    return response.data;
  },

  async reset(): Promise<OnboardingState> {
    const response = await api.post<OnboardingState>("/onboarding/reset");
    return response.data;
  },
};
