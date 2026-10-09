import { Permission } from "@/lib/permissions";
import type { ProfessionalCouncil } from "@/lib/professional-council";

export interface CollaboratorUpdateState {
  email: string;
  permissions: Permission[];
  isDoctor?: boolean;
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

export interface CollaboratorUpdatePayload {
  email?: string;
  permissions?: Permission[];
  isDoctor?: boolean;
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

export function buildCollaboratorUpdatePayload(
  original: CollaboratorUpdateState,
  current: CollaboratorUpdateState,
): CollaboratorUpdatePayload | null {
  const emailChanged = current.email !== original.email;
  const permissionsChanged =
    JSON.stringify(current.permissions) !== JSON.stringify(original.permissions);
  const isDoctorChanged =
    current.isDoctor !== undefined && current.isDoctor !== original.isDoctor;

  if (!emailChanged && !permissionsChanged && !isDoctorChanged) return null;

  return {
    ...(emailChanged ? { email: current.email } : {}),
    ...(permissionsChanged ? { permissions: current.permissions } : {}),
    ...(isDoctorChanged
      ? {
          isDoctor: current.isDoctor,
          ...(current.isDoctor
            ? current.council && current.council !== "CRM"
              ? {
                  council: current.council,
                  ...(current.crm ? { crm: current.crm } : {}),
                  ...(current.crmState ? { crmState: current.crmState } : {}),
                  ...(current.specialty
                    ? { specialty: current.specialty }
                    : {}),
                }
              : {
                  ...(current.council ? { council: current.council } : {}),
                  crm: current.crm ?? "",
                  crmState: current.crmState ?? "",
                  ...(current.specialty
                    ? { specialty: current.specialty }
                    : {}),
                }
            : {}),
        }
      : {}),
  };
}

export interface DoctorProfileFields {
  council: ProfessionalCouncil;
  crm: string;
  crmState: string;
  specialty: string;
}

export interface DoctorProfileUpdatePayload {
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

export function buildDoctorProfileUpdatePayload(
  original: DoctorProfileFields,
  current: DoctorProfileFields,
): DoctorProfileUpdatePayload | null {
  const payload: DoctorProfileUpdatePayload = {};
  if (current.council !== original.council) payload.council = current.council;
  for (const campo of ["crm", "crmState", "specialty"] as const) {
    const atual = current[campo].trim();
    if (atual !== original[campo].trim()) payload[campo] = atual;
  }
  return Object.keys(payload).length > 0 ? payload : null;
}

export interface OwnDoctorProfileFields {
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

export function buildOwnDoctorProfilePayload(
  original: OwnDoctorProfileFields,
  current: OwnDoctorProfileFields,
  options: { allowCouncil?: boolean } = {},
): DoctorProfileUpdatePayload | null {
  const comoCampos = (p: OwnDoctorProfileFields): DoctorProfileFields => ({
    council: "CRM",
    crm: p.crm ?? "",
    crmState: p.crmState ?? "",
    specialty: p.specialty ?? "",
  });
  const payload: DoctorProfileUpdatePayload = {
    ...buildDoctorProfileUpdatePayload(
      comoCampos(original),
      comoCampos(current),
    ),
  };
  if (
    options.allowCouncil &&
    current.council !== undefined &&
    current.council !== (original.council ?? "CRM")
  ) {
    payload.council = current.council;
  }
  return Object.keys(payload).length > 0 ? payload : null;
}

export function buildAvatarUpdate(params: {
  savedAvatarUrl: string | null | undefined;
  uploadedPath: string | undefined;
  hasPreview: boolean;
}): { avatarUrl?: string | null } {
  if (params.uploadedPath) return { avatarUrl: params.uploadedPath };
  if (params.savedAvatarUrl && !params.hasPreview) return { avatarUrl: null };
  return {};
}
