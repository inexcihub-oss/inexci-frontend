import api from "@/lib/api";

export interface CalculatedPendency {
  key: string;
  name: string;
  description: string;
  isComplete: boolean;
  isOptional: boolean;
  isWaiting: boolean;
  responsible: "collaborator" | "patient" | "doctor";
  statusContext: number;
  checkItems?: Array<{ label: string; done: boolean }>;
}

export interface ValidationResult {
  currentStatus: number;
  statusLabel: string;
  pendencies: CalculatedPendency[];
  canAdvance: boolean;
  nextStatus: number | null;
  completedCount: number;
  pendingCount: number;
  totalCount: number;
}

export interface PendencySummaryFull {
  total: number;
  pending: number;
  completed: number;
  optional: number;
  canAdvance: boolean;
}

export interface BatchPendencySummary {
  pending: number;
  total: number;
  canAdvance: boolean;
}

export const pendencyService = {
  async validate(surgeryRequestId: string | number): Promise<ValidationResult> {
    const response = await api.get(
      `/surgery-requests/pendencies/validate/${surgeryRequestId}`,
    );
    return response.data;
  },

  async getBatchSummary(
    surgeryRequestIds: string[],
  ): Promise<Record<string, BatchPendencySummary>> {
    if (surgeryRequestIds.length === 0) return {};

    const response = await api.get(
      "/surgery-requests/pendencies/batch-summary",
      {
        params: { ids: surgeryRequestIds.join(",") },
      },
    );
    return response.data;
  },

  async getSummary(
    surgeryRequestId: string | number,
  ): Promise<PendencySummaryFull> {
    const response = await api.get(
      `/surgery-requests/pendencies/summary/${surgeryRequestId}`,
    );
    return response.data;
  },
};
