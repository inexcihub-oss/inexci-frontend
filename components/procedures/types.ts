import { SurgeryRequestTemplateSummary } from "@/services/surgery-request.service";

export interface ProcedureModel {
  id: string;
  modelName: string;
  procedureName: string;
  createdAt: string;
  createdBy: string;
  usageCount: number;
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
