export interface DoctorHeader {
  id: string;
  doctor_profile_id: string;
  logo_url: string | null;
  logo_position: "left" | "right";
  content_html: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertDoctorHeaderInput {
  logo_url?: string | null;
  logo_position?: "left" | "right";
  content_html?: string | null;
}
