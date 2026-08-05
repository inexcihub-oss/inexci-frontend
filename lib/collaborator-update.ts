import { Permission } from "@/lib/permissions";

export interface CollaboratorUpdateState {
  email: string;
  permissions: Permission[];
  /** "É médico" — cria/remove o `doctor_profile` no backend. */
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

export interface CollaboratorUpdatePayload {
  email?: string;
  permissions?: Permission[];
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

/**
 * Decide o corpo do `PATCH /users/collaborators/:id` a partir do que mudou
 * entre o estado original e o editado. E-mail, permissões e "é médico" viajam
 * juntos por esse endpoint de propósito: é o único DTO que aceita
 * `permissions` e `isDoctor` — o `PATCH /users/:id` genérico
 * (`updateProfile`) não aceita nenhum dos dois.
 *
 * Quando `isDoctor` muda, CRM/UF/especialidade vão junto: o DTO do backend
 * (`UpdateCollaboratorDto`) exige `crm` e `crmState` sempre que
 * `isDoctor === true`.
 *
 * Retorna `null` quando nada mudou, para o chamador pular a chamada.
 */
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
          // CRM/UF só fazem sentido (e só são aceitos) quando vira médico.
          ...(current.isDoctor
            ? {
                crm: current.crm ?? "",
                crmState: current.crmState ?? "",
                ...(current.specialty ? { specialty: current.specialty } : {}),
              }
            : {}),
        }
      : {}),
  };
}
