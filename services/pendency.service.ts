import api from "@/lib/api";

// Pendência calculada dinamicamente (sem tabela)
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

// Resultado da validação dinâmica
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

export const pendencyService = {
  /**
   * Validação dinâmica - calcula pendências baseadas nos dados atuais
   * Esta é a forma recomendada de obter pendências
   */
  async validate(surgeryRequestId: string | number): Promise<ValidationResult> {
    const response = await api.get(
      `/surgery-requests/pendencies/validate/${surgeryRequestId}`,
    );
    return response.data;
  },

  /**
   * Resumo em lote para múltiplas solicitações (para Kanban)
   * Retorna um objeto indexado por ID com os contadores de pendências
   */
  async getBatchSummary(
    surgeryRequestIds: string[],
  ): Promise<
    Record<string, { pending: number; completed: number; total: number }>
  > {
    if (surgeryRequestIds.length === 0) return {};

    const response = await api.get(
      "/surgery-requests/pendencies/batch-summary",
      {
        params: { ids: surgeryRequestIds.join(",") },
      },
    );
    return response.data;
  },

  /**
   * Busca resumo das pendências de uma solicitação
   */
  async getSummary(
    surgeryRequestId: string | number,
  ): Promise<PendencySummaryFull> {
    const response = await api.get(
      `/surgery-requests/pendencies/summary/${surgeryRequestId}`,
    );
    return response.data;
  },
};
