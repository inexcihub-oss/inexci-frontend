import api from "@/lib/api";

export interface Pendency {
  id: number;
  key: string;
  name: string;
  description: string;
  concluded_at: string | null;
  responsible_type: "collaborator" | "patient" | "doctor";
  is_optional: boolean;
  is_waiting: boolean;
  status_context: number;
  responsible?: {
    id: number;
    name: string;
  };
}

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

export interface PendenciesSummary {
  total: number;
  completed: number;
  pending: number;
  optional: number;
  percentage: number;
}

export interface GroupedPendencies {
  current: Pendency[];
  completed: Pendency[];
  summary: PendenciesSummary;
}

export interface PendencyCheckResult {
  canAdvance: boolean;
  pendingItems: Pendency[];
  completedItems: Pendency[];
  nextStatus: number | null;
  currentStatus: number;
}

export interface PendencyByStatus {
  status: number;
  statusLabel: string;
  pending: number;
  completed: number;
}

export interface PendencySummaryFull {
  total: number;
  pending: number;
  completed: number;
  optional: number;
  byStatus: PendencyByStatus[];
}

export const pendencyService = {
  /**
   * Validação dinâmica - calcula pendências baseadas nos dados atuais
   * Esta é a forma recomendada de obter pendências
   */
  async validate(surgeryRequestId: string): Promise<ValidationResult> {
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
   * Resumo rápido para Kanban
   */
  async getQuickSummary(
    surgeryRequestId: string,
  ): Promise<{ pending: number; total: number; canAdvance: boolean }> {
    const response = await api.get(
      `/surgery-requests/pendencies/quick-summary/${surgeryRequestId}`,
    );
    return response.data;
  },

  /**
   * Busca todas as pendências de uma solicitação
   * @deprecated Use validate() para obter pendências calculadas dinamicamente
   */
  async getAll(
    surgeryRequestId: string,
  ): Promise<{ total: number; records: Pendency[] }> {
    const response = await api.get("/surgery-requests/pendencies", {
      params: { surgery_request_id: surgeryRequestId },
    });
    return response.data;
  },

  /**
   * Busca pendências agrupadas por status (atuais vs concluídas)
   */
  async getGrouped(surgeryRequestId: string): Promise<GroupedPendencies> {
    const response = await api.get(
      `/surgery-requests/pendencies/grouped/${surgeryRequestId}`,
    );
    return response.data;
  },

  /**
   * Busca resumo das pendências
   */
  async getSummary(surgeryRequestId: string): Promise<PendencySummaryFull> {
    const response = await api.get(
      `/surgery-requests/pendencies/summary/${surgeryRequestId}`,
    );
    return response.data;
  },

  /**
   * Verifica se pode avançar de status
   */
  async checkStatus(surgeryRequestId: string): Promise<PendencyCheckResult> {
    const response = await api.get(
      `/surgery-requests/pendencies/check/${surgeryRequestId}`,
    );
    return response.data;
  },

  /**
   * Conclui uma pendência manualmente
   */
  async complete(pendencyId: number): Promise<Pendency> {
    const response = await api.patch(
      `/surgery-requests/pendencies/${pendencyId}/complete`,
    );
    return response.data;
  },

  /**
   * Conclui uma pendência por ID da solicitação e ID da pendência
   */
  async completeWithSurgeryRequest(
    surgeryRequestId: string,
    pendencyId: number,
  ): Promise<{
    pendency: Pendency;
    transitioned: boolean;
    newStatus: number | null;
  }> {
    const response = await api.patch(
      `/surgery-requests/${surgeryRequestId}/pendencies/${pendencyId}/complete`,
    );
    return response.data;
  },
};
