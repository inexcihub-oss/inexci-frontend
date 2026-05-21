export interface DoctorHeader {
  id: string;
  doctorProfileId: string;
  logoUrl: string | null;
  logoPosition: "left" | "center" | "right";
  contentHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDoctorHeaderInput {
  logoUrl?: string | null;
  logoPosition?: "left" | "center" | "right";
  contentHtml?: string | null;
}
