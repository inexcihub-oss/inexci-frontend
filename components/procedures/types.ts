// Types for the Procedures (Models) feature

import { SurgeryRequestTemplateSummary } from "@/services/surgery-request.service";

/**
 * Linha da tabela de modelos. Só o que a listagem pinta — documentos, OPME e
 * itens TUSS vivem no `templateData` e são carregados pelo side sheet quando o
 * modelo é aberto, não numa lista que nunca os exibe.
 */
export interface ProcedureModel {
  id: string;
  modelName: string;
  procedureName: string;
  createdAt: string;
  createdBy: string;
  usageCount: number;
  /** Resumo da API, repassado ao wizard sem nova busca. */
  summary: SurgeryRequestTemplateSummary;
}

export interface ProcedureDocument {
  id: string;
  type: string;
  name: string;
}

export interface ProcedureOpmeItem {
  id: string;
  name: string;
  quantity: number;
  manufacturers: string[];
  suppliers: string[];
}

export interface ProcedureTussItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
}
