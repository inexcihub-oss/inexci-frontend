import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import { AvailableDoctor } from "@/types";

interface BackendDoctorRecord {
  id: string;
  name: string;
  doctorProfile?: {
    crm?: string;
    crmState?: string;
    specialty?: string;
  };
}

export const availableDoctorsService = {
  /**
   * Busca médicos disponíveis para criação de solicitação cirúrgica.
   * - admin: todos os médicos da conta (incluindo ele mesmo se for médico)
   * - collaborator: apenas médicos que tem acesso via user_doctor_access
   */
  async getAvailableDoctors(): Promise<AvailableDoctor[]> {
    const { data } = await api.get<AvailableDoctor[]>(
      "/surgery-requests/available-doctors",
    );
    return data;
  },

  /**
   * Busca todos os médicos da conta (para admin gerenciar acessos)
   */
  async getDoctorsForAccount(): Promise<AvailableDoctor[]> {
    const { data } = await api.get("/users/doctors");
    const records = getApiRecords<BackendDoctorRecord>(data);

    return records.map((user) => ({
      id: user.id,
      name: user.name,
      crm: user.doctorProfile?.crm ?? "",
      crmState: user.doctorProfile?.crmState ?? "",
      specialty: user.doctorProfile?.specialty ?? undefined,
    }));
  },
};
