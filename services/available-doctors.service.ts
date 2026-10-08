import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import { AvailableDoctor } from "@/types";
import {
  councilOf,
  emiteDocumentosClinicos,
  ProfessionalCouncil,
} from "@/lib/professional-council";

interface BackendDoctorRecord {
  id: string;
  name: string;
  status?: string;
  doctorProfile?: {
    council?: ProfessionalCouncil;
    crm?: string | null;
    crmState?: string | null;
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
      council: councilOf(user.doctorProfile),
      isPhysician: councilOf(user.doctorProfile) === "CRM",
      canIssueClinicalDocuments: emiteDocumentosClinicos(
        user.doctorProfile ?? { council: "CRM" },
      ),
      status: user.status,
    }));
  },
};
