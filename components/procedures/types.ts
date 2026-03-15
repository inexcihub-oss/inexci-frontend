// Types for the Procedures (Models) feature

export interface ProcedureModel {
  id: string;
  modelName: string;
  procedureName: string;
  createdAt: string;
  createdBy: string;
  usageCount: number;
  documents?: ProcedureDocument[];
  opmeItems?: ProcedureOpmeItem[];
  tussItems?: ProcedureTussItem[];
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
