import { Permission } from "@/lib/permissions";
import type { ProfessionalCouncil } from "@/lib/professional-council";

export interface CollaboratorUpdateState {
  email: string;
  permissions: Permission[];
  /** "É profissional de saúde" — cria/remove o `doctor_profile` no backend. */
  isDoctor?: boolean;
  /** Conselho do perfil criado. Ausente = o backend assume CRM. */
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

/**
 * Decide o corpo do `PATCH /users/collaborators/:id` a partir do que mudou
 * entre o estado original e o editado. E-mail, permissões e "é médico" viajam
 * juntos por esse endpoint de propósito: é o único DTO que aceita
 * `permissions` e `isDoctor` — o `PATCH /users/:id` genérico
 * (`updateProfile`) não aceita nenhum dos dois.
 *
 * Quando `isDoctor` muda, conselho/número/UF/especialidade vão junto: o
 * backend exige número e UF quando o conselho é CRM (o default). Para os
 * demais conselhos, número e UF são opcionais e só vão se preenchidos.
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
          // Registro só faz sentido (e só é aceito) quando vira profissional.
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

/**
 * Corpo do `PATCH /users/doctor-profile/:id` para quem **já** é profissional.
 *
 * Cada campo só vai quando mudou. Campo apagado vai como `""` — o backend
 * grava `null` (`data.crm?.trim() || null`); `undefined` significa "não
 * mexer", e era o que o `|| undefined` antigo mandava, então apagar o número
 * ou a UF de um não médico não apagava nada.
 *
 * O conselho só vai quando mudou por outro motivo também: trocar é ato de
 * Administração no backend.
 *
 * Retorna `null` quando nada mudou.
 */
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

/** Registro profissional como a tela de Configurações guarda (campos opcionais). */
export interface OwnDoctorProfileFields {
  /** Só é considerado com `allowCouncil` (dono da conta). */
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

/**
 * Corpo do `PATCH /users/doctor-profile/:id` que o próprio profissional manda
 * em Configurações. Mesma regra do `buildDoctorProfileUpdatePayload`: só vai o
 * que mudou, e campo apagado vai como `""` (o backend grava `null`) — o
 * `|| undefined` antigo da tela significava "não mexer", então o profissional
 * de um conselho que não exige registro não conseguia apagar número/UF.
 *
 * Mandar só o que mudou também protege o perfil antigo com número vazio: o
 * backend valida o registro quando a requisição mexe nele, e reenviar o
 * número vazio sem mudança travaria salvar o resto do perfil.
 *
 * O conselho só vai com `allowCouncil` — ou seja, para o DONO da conta, que é
 * a própria administração (o backend o deixa trocar o próprio conselho). Para
 * os demais (inclusive o admin delegado) nunca vai: trocar é ato da
 * administração da conta.
 *
 * Retorna `null` quando nada mudou.
 */
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

/**
 * Trecho do `PUT /users/profile` que mexe no avatar.
 *
 * - Arquivo novo enviado: manda o caminho devolvido pelo upload.
 * - Havia avatar gravado e agora não há prévia nem arquivo (o usuário clicou
 *   em remover): manda `null` — o backend apaga o campo e o arquivo antigo.
 * - Qualquer outro caso: não manda o campo (não mexer).
 */
export function buildAvatarUpdate(params: {
  savedAvatarUrl: string | null | undefined;
  uploadedPath: string | undefined;
  hasPreview: boolean;
}): { avatarUrl?: string | null } {
  if (params.uploadedPath) return { avatarUrl: params.uploadedPath };
  if (params.savedAvatarUrl && !params.hasPreview) return { avatarUrl: null };
  return {};
}
