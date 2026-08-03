import { Permission } from "@/lib/permissions";

export interface CollaboratorUpdateState {
  email: string;
  permissions: Permission[];
}

export interface CollaboratorUpdatePayload {
  email?: string;
  permissions?: Permission[];
}

/**
 * Decide o corpo do `PATCH /users/collaborators/:id` a partir do que mudou
 * entre o estado original e o editado. E-mail e permissões viajam juntos
 * por esse endpoint de propósito: é o único DTO que aceita `permissions` —
 * o `PATCH /users/:id` genérico (`updateProfile`) não aceita.
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

  if (!emailChanged && !permissionsChanged) return null;

  return {
    ...(emailChanged ? { email: current.email } : {}),
    ...(permissionsChanged ? { permissions: current.permissions } : {}),
  };
}
