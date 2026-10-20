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

export const pendencyService = {
  async validate(surgeryRequestId: string | number): Promise<ValidationResult> {
    const response = await api.get(
      `/surgery-requests/pendencies/validate/${surgeryRequestId}`,
    );
    return response.data;
  },
};
