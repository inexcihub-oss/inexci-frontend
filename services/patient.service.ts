import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  cpf?: string;
  photoUrl?: string | null;
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
  secondaryPhone?: string;
  cpf?: string;
  photoPath?: string | null;
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
}

interface BackendPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string | null;
  cpf?: string | null;
  photoUrl?: string | null;
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
    secondaryPhone: p.secondaryPhone ?? undefined,
    cpf: p.cpf ?? undefined,
    photoUrl: p.photoUrl ?? null,
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

export type PatientListItem = Pick<
  Patient,
  | "id"
  | "name"
  | "cpf"
  | "email"
  | "phone"
  | "photoUrl"
  | "healthPlanId"
  | "birthDate"
  | "createdAt"
  | "updatedAt"
>;

function mapPatientListItem(p: BackendPatient): PatientListItem {
  const {
    id,
    name,
    cpf,
    email,
    phone,
    photoUrl,
    healthPlanId,
    birthDate,
    createdAt,
    updatedAt,
  } = mapBackendPatient(p);
  return {
    id,
    name,
    cpf,
    email,
    phone,
    photoUrl,
    healthPlanId,
    birthDate,
    createdAt,
    updatedAt,
  };
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
  async list(params: PatientListParams = {}): Promise<PatientListResult> {
    const response = await api.get<
      BackendPatient[] | { records?: BackendPatient[]; total?: number }
    >("/patients", {
      params: {
        skip: params.skip,
        take: params.take,
        ...(params.search ? { search: params.search } : {}),
      },
    });
    const records = getApiRecords<BackendPatient>(response.data).map(
      mapPatientListItem,
    );
    const body = Array.isArray(response.data) ? undefined : response.data;
    const total = typeof body?.total === "number" ? body.total : records.length;
    return { records, total };
  },

  async getAll(): Promise<PatientListItem[]> {
    const response = await api.get<unknown>("/patients", {
      params: { take: FETCH_ALL_TAKE },
    });
    const data = getApiRecords<BackendPatient>(response.data);
    return data.map(mapPatientListItem);
  },

  async getById(patientId: string): Promise<Patient | null> {
    try {
      const response = await api.get<BackendPatient>(`/patients/${patientId}`);
      return response.data ? mapBackendPatient(response.data) : null;
    } catch {
      return null;
    }
  },

  async discardPhoto(path: string): Promise<void> {
    try {
      await api.post("/patients/photos/discard", { path });
    } catch {
    }
  },

  async create(payload: CreatePatientPayload): Promise<Patient> {
    const response = await api.post<BackendPatient>("/patients", payload);
    return mapBackendPatient(response.data);
  },

  async update(
    patientId: string,
    payload: UpdatePatientPayload,
  ): Promise<Patient> {
    const response = await api.patch<BackendPatient>(
      `/patients/${patientId}`,
      payload,
    );
    return mapBackendPatient(response.data);
  },

  async delete(patientId: string): Promise<void> {
    await api.delete(`/patients/${patientId}`);
  },

  async deleteMany(patientIds: string[]): Promise<void> {
    if (!patientIds.length) return;
    await api.post("/patients/bulk-delete", { ids: patientIds });
  },
};
