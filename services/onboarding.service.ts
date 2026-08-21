import api from "@/lib/api";
import type { OnboardingPatch, OnboardingState } from "@/lib/onboarding/state";

export const onboardingService = {
  async getState(): Promise<OnboardingState> {
    const response = await api.get<OnboardingState>("/onboarding/state");
    return response.data;
  },

  async patch(patch: OnboardingPatch): Promise<OnboardingState> {
    const response = await api.patch<OnboardingState>(
      "/onboarding/state",
      patch,
    );
    return response.data;
  },

  /** Botão "Refazer o onboarding" da aba de Configurações. */
  async reset(): Promise<OnboardingState> {
    const response = await api.post<OnboardingState>("/onboarding/reset");
    return response.data;
  },
};
