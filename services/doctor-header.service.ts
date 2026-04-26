import api from "@/lib/api";
import { DoctorHeader, UpsertDoctorHeaderInput } from "@/types/doctor-header.types";

export const doctorHeaderService = {
  get: (): Promise<DoctorHeader | null> =>
    api.get<DoctorHeader | null>("/users/me/header").then((r) => r.data),

  upsert: (data: UpsertDoctorHeaderInput): Promise<DoctorHeader> =>
    api.put<DoctorHeader>("/users/me/header", data).then((r) => r.data),

  remove: (): Promise<void> =>
    api.delete("/users/me/header").then(() => undefined),
};
