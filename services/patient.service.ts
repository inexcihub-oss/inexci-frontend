import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  healthPlanId?: string;
  healthPlanNumber?: string;
  healthPlanType?: string;
  medicalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePatientPayload {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  healthPlanId?: string;
  healthPlanNumber?: string;
  healthPlanType?: string;
  medicalNotes?: string;
}

export interface CreatePatientPayload extends UpdatePatientPayload {
  name: string;
  cpf: string;
}

interface BackendPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string | Date;
  gender?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  healthPlanId?: string;
  healthPlanNumber?: string;
  healthPlanType?: string;
  medicalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

function mapBackendPatient(p: BackendPatient): Patient {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    cpf: p.cpf,
    birthDate: p.birthDate
      ? typeof p.birthDate === "string"
        ? p.birthDate.substring(0, 10)
        : new Date(p.birthDate).toISOString().substring(0, 10)
      : undefined,
    gender: p.gender,
    address: p.address,
    addressNumber: p.addressNumber,
    addressComplement: p.addressComplement,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    healthPlanId: p.healthPlanId,
    healthPlanNumber: p.healthPlanNumber,
    healthPlanType: p.healthPlanType,
    medicalNotes: p.medicalNotes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * O que `GET /patients` devolve: as colunas da tela de pacientes e o que os
 * seletores exibem. Endereço, convênio e `medicalNotes` ficam de fora — são do
 * cadastro completo (`getById`), que passa pelo audit de prontuário no backend.
 *
 * É um `Pick` de propósito: um `Patient` completo continua atribuível a este
 * tipo (o formulário de criação devolve um e alimenta as mesmas listas), mas o
 * caminho contrário não compila — ler `medicalNotes` de uma linha de listagem
 * vira erro de tipo em vez de `undefined` silencioso em produção.
 */
export type PatientListItem = Pick<
  Patient,
  | "id"
  | "name"
  | "cpf"
  | "email"
  | "phone"
  | "birthDate"
  | "createdAt"
  | "updatedAt"
>;

function mapPatientListItem(p: BackendPatient): PatientListItem {
  const { id, name, cpf, email, phone, birthDate, createdAt, updatedAt } =
    mapBackendPatient(p);
  return { id, name, cpf, email, phone, birthDate, createdAt, updatedAt };
}

export interface PatientListParams {
  skip?: number;
  take?: number;
  search?: string;
}

export interface PatientListResult {
  records: PatientListItem[];
  total: number;
}

export const patientService = {
  /**
   * Listagem paginada com busca server-side (item 3.3). Usada pela tela de
   * pacientes — não carrega a tabela inteira no navegador.
   */
  async list(params: PatientListParams = {}): Promise<PatientListResult> {
    const response = await api.get("/patients", {
      params: {
        skip: params.skip,
        take: params.take,
        ...(params.search ? { search: params.search } : {}),
      },
    });
    const records = getApiRecords<BackendPatient>(response.data).map(
      mapPatientListItem,
    );
    const total =
      typeof (response.data as { total?: number })?.total === "number"
        ? (response.data as { total: number }).total
        : records.length;
    return { records, total };
  },

  /**
   * Busca todos os pacientes. Usado pelos seletores do wizard/modais, que
   * filtram em memória; a tela de pacientes usa `list()` paginado. Devolve o
   * mesmo recorte de `list()` — é a mesma rota.
   */
  async getAll(): Promise<PatientListItem[]> {
    const response = await api.get("/patients", {
      params: { take: FETCH_ALL_TAKE },
    });
    const data = getApiRecords<BackendPatient>(response.data);
    return data.map(mapPatientListItem);
  },

  /**
   * Busca um paciente específico por ID (GET /patients/:id — item 3.2).
   * O backend valida o acesso por owner via AccessControlService.
   */
  async getById(patientId: string): Promise<Patient | null> {
    try {
      const response = await api.get<BackendPatient>(`/patients/${patientId}`);
      return response.data ? mapBackendPatient(response.data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Cria um novo paciente
   */
  async create(payload: CreatePatientPayload): Promise<Patient> {
    const response = await api.post("/patients", payload);
    return response.data;
  },

  /**
   * Atualiza um paciente
   */
  async update(
    patientId: string,
    payload: UpdatePatientPayload,
  ): Promise<Patient> {
    const response = await api.patch(`/patients/${patientId}`, payload);
    return response.data;
  },

  /**
   * Deleta um paciente
   */
  async delete(patientId: string): Promise<void> {
    await api.delete(`/patients/${patientId}`);
  },

  async deleteMany(patientIds: string[]): Promise<void> {
    if (!patientIds.length) return;
    await api.post("/patients/bulk-delete", { ids: patientIds });
  },
};
