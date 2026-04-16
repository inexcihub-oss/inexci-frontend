import api from "@/lib/api";
import { UserDoctorAccess } from "@/types";

export const userDoctorAccessService = {
  /**
   * Busca os acessos de um colaborador a médicos
   */
  async getAccessForUser(userId: string): Promise<UserDoctorAccess[]> {
    const { data } = await api.get<UserDoctorAccess[]>(
      `/user-doctor-access?userId=${userId}`,
    );
    return data;
  },

  /**
   * Define (PUT) os acessos de um colaborador a médicos
   * Substitui todos os acessos existentes
   */
  async setAccessForUser(
    userId: string,
    doctorUserIds: string[],
  ): Promise<UserDoctorAccess[]> {
    const { data } = await api.put<UserDoctorAccess[]>(
      `/user-doctor-access/${userId}`,
      { doctorUserIds },
    );
    return data;
  },

  /**
   * Adiciona acesso individual de um colaborador a um médico
   */
  async addAccess(
    userId: string,
    doctorUserId: string,
  ): Promise<UserDoctorAccess> {
    const { data } = await api.post<UserDoctorAccess>("/user-doctor-access", {
      user_id: userId,
      doctor_user_id: doctorUserId,
    });
    return data;
  },

  /**
   * Desativa o acesso de um colaborador a um médico
   */
  async deactivateAccess(userId: string, doctorUserId: string): Promise<void> {
    await api.patch(`/user-doctor-access/${userId}/${doctorUserId}/deactivate`);
  },
};
