import api from "@/lib/api";
import { UserDoctorAccess } from "@/types";

export const userDoctorAccessService = {
  async getAccessForUser(userId: string): Promise<UserDoctorAccess[]> {
    const { data } = await api.get<
      { records: UserDoctorAccess[] } | UserDoctorAccess[]
    >(`/user-doctor-access?userId=${userId}`);
    return Array.isArray(data)
      ? data
      : ((data as { records: UserDoctorAccess[] }).records ?? []);
  },

  async setAccessForUser(
    userId: string,
    doctorUserIds: string[],
  ): Promise<UserDoctorAccess[]> {
    const { data } = await api.put<
      { records: UserDoctorAccess[] } | UserDoctorAccess[]
    >(`/user-doctor-access/${userId}`, { doctor_user_ids: doctorUserIds });
    return Array.isArray(data)
      ? data
      : ((data as { records: UserDoctorAccess[] }).records ?? []);
  },

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

  async deactivateAccess(userId: string, doctorUserId: string): Promise<void> {
    await api.patch(`/user-doctor-access/${userId}/${doctorUserId}/deactivate`);
  },
};
