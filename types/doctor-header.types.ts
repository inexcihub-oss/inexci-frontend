export interface DoctorHeader {
  id: string;
  doctorProfileId: string;
  logoUrl: string | null;
  logoPosition: "left" | "right";
  contentHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDoctorHeaderInput {
  logoUrl?: string | null;
  logoPosition?: "left" | "right";
  contentHtml?: string | null;
}
