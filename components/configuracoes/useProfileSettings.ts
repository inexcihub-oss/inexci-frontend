import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import type { ToastType } from "@/types/toast.types";
import { userService } from "@/services/user.service";
import { uploadService } from "@/services/upload.service";
import {
  buildAvatarUpdate,
  buildOwnDoctorProfilePayload,
  type OwnDoctorProfileFields,
} from "@/lib/collaborator-update";
import { councilOf, ProfessionalCouncil } from "@/lib/professional-council";
import { clearAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import { profileSchema } from "@/lib/schemas/configuracoes.schema";
import { summarizeErrors } from "@/lib/form-errors";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";
import { maskCpf, maskPhone, unmask } from "@/lib/masks";
import { removeBackground } from "@/lib/utils";
import { resolveSignedUrl } from "@/lib/signed-url";
import { surgeryRequestKeys } from "@/lib/query-keys";
import { issuesToFieldErrors } from "./SettingsControls";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  document: string;
  birthDate: string;
  gender: string;
  specialty?: string;
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  signatureImageUrl?: string;
  isDoctor?: boolean;
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  document: "CPF",
};

const EMPTY_PROFILE: UserProfile = {
  name: "",
  email: "",
  phone: "",
  document: "",
  birthDate: "",
  gender: "",
  specialty: "",
  crm: "",
  crmState: "",
};

interface UseProfileSettingsOptions {
  user: User | null;
  isAccountOwner: boolean;
  updateUser: () => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

export function useProfileSettings({
  user,
  isAccountOwner,
  updateUser,
  showToast,
}: UseProfileSettingsOptions) {
  const queryClient = useQueryClient();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {},
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureDeleted, setSignatureDeleted] = useState(false);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);
  const registroSalvoRef = useRef<OwnDoctorProfileFields>({});
  const avatarSalvoRef = useRef<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileData = await userService.getProfile();
        const dp = profileData.doctorProfile;
        if (!isMounted) return;
        registroSalvoRef.current = {
          council: councilOf(dp),
          crm: dp?.crm || "",
          crmState: dp?.crmState || "",
          specialty: dp?.specialty || "",
        };
        avatarSalvoRef.current = profileData.avatarUrl || null;
        setProfile({
          name: profileData.name || "",
          email: profileData.email || "",
          phone: maskPhone(profileData.phone || ""),
          document: maskCpf(profileData.cpf || profileData.document || ""),
          birthDate: profileData.birthDate
            ? new Date(profileData.birthDate).toISOString().split("T")[0]
            : "",
          gender: profileData.gender || "",
          specialty: dp?.specialty || "",
          council: councilOf(dp),
          crm: dp?.crm || "",
          crmState: dp?.crmState || "",
          signatureImageUrl: dp?.signatureUrl || "",
          isDoctor: profileData.isDoctor || false,
        });
        const [avatarUrl, signatureUrl] = await Promise.all([
          resolveSignedUrl(profileData.avatarUrl),
          resolveSignedUrl(dp?.signatureUrl),
        ]);
        if (!isMounted) return;
        if (avatarUrl) setAvatarPreview(avatarUrl);
        if (signatureUrl) setSignaturePreview(signatureUrl);
      } catch (error) {
        logger.error("Erro ao carregar perfil:", error);
        if (isMounted && user) {
          const dp = user.doctorProfile;
          registroSalvoRef.current = {
            council: councilOf(dp),
            crm: dp?.crm || "",
            crmState: dp?.crmState || "",
            specialty: dp?.specialty || "",
          };
          setProfile({
            name: user.name || "",
            email: user.email || "",
            phone: maskPhone(user.phone || ""),
            document: "",
            birthDate: "",
            gender: "",
            specialty: dp?.specialty || "",
            council: councilOf(dp),
            crm: dp?.crm || "",
            crmState: dp?.crmState || "",
            isDoctor: user.isDoctor || false,
          });
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("A imagem deve ter no máximo 5MB", "error");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const handleSignatureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > 2 * 1024 * 1024) {
      showToast("A assinatura deve ter no máximo 2MB", "error");
      return;
    }
    setIsProcessingSignature(true);
    try {
      const processed = await removeBackground(rawFile);
      setSignatureFile(processed);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(processed);
    } catch {
      showToast("Erro ao processar imagem da assinatura", "error");
    } finally {
      setIsProcessingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  const handleDeleteSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    setSignatureDeleted(true);
  };

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => {
        const { [field]: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSaveProfile = async () => {
    const validation = profileSchema.safeParse({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      document: profile.document,
      birthDate: profile.birthDate,
      gender: profile.gender,
      specialty: profile.specialty,
      crm: profile.crm,
      crmState: profile.crmState,
    });
    if (!validation.success) {
      const errs = issuesToFieldErrors(validation.error.issues);
      setProfileErrors(errs);
      showToast(summarizeErrors(errs, PROFILE_FIELD_LABELS), "error");
      return;
    }
    setProfileErrors({});

    setSaving(true);
    try {
      let avatarUrl: string | undefined = undefined;
      let avatarResolvedUrl: string | undefined = undefined;
      if (avatarFile) {
        try {
          const result = await uploadService.uploadSingle(
            avatarFile,
            "avatars",
          );
          avatarUrl = result.data.path;
          avatarResolvedUrl = result.data.url;
        } catch {
          showToast("Erro ao fazer upload do avatar", "error");
          setSaving(false);
          return;
        }
      }

      let signaturePath: string | undefined = undefined;
      if (signatureFile) {
        try {
          const sigResult = await uploadService.uploadSingle(
            signatureFile,
            "signatures",
          );
          signaturePath = sigResult.data.path;
        } catch {
          showToast("Erro ao fazer upload da assinatura", "error");
          setSaving(false);
          return;
        }
      }

      const phoneDigits = unmask(profile.phone);
      const documentDigits = unmask(profile.document);
      await userService.updateProfile({
        name: profile.name.trim(),
        phone: phoneDigits || undefined,
        cpf: documentDigits || undefined,
        birthDate: profile.birthDate || undefined,
        gender: profile.gender || undefined,
        ...buildAvatarUpdate({
          savedAvatarUrl: avatarSalvoRef.current,
          uploadedPath: avatarFile ? avatarUrl : undefined,
          hasPreview: !!avatarPreview,
        }),
        ...(signatureFile
          ? { signatureUrl: signaturePath }
          : signatureDeleted
            ? { signatureUrl: null }
            : {}),
      });

      if (profile.isDoctor && user?.id) {
        const registro: OwnDoctorProfileFields = {
          council: profile.council,
          crm: profile.crm,
          crmState: profile.crmState,
          specialty: profile.specialty,
        };
        const payloadRegistro = buildOwnDoctorProfilePayload(
          registroSalvoRef.current,
          registro,
          { allowCouncil: isAccountOwner },
        );
        if (payloadRegistro) {
          await userService.updateDoctorProfile(user.id, payloadRegistro);
          registroSalvoRef.current = registro;
        }
      }

      if (avatarFile && avatarUrl) avatarSalvoRef.current = avatarUrl;
      else if (!avatarPreview) avatarSalvoRef.current = null;

      await updateUser();
      setAvatarFile(null);
      setSignatureFile(null);
      setSignatureDeleted(false);

      if (signatureFile || signatureDeleted) {
        await queryClient.invalidateQueries({
          queryKey: surgeryRequestKeys.details(),
        });
      }

      if (user?.id) {
        if (!avatarPreview) {
          clearAvatarCache(user.id);
        } else if (avatarUrl && avatarResolvedUrl) {
          setAvatarCache(user.id, avatarUrl, avatarResolvedUrl);
        }
      }

      showToast("Perfil atualizado com sucesso!", "success");
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, "Erro ao atualizar perfil"), "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    loadingProfile,
    saving,
    profile,
    setProfile,
    profileErrors,
    updateProfileField,
    avatarPreview,
    avatarInputRef,
    handleAvatarChange,
    removeAvatar,
    signaturePreview,
    signatureFile,
    signatureDeleted,
    isProcessingSignature,
    signatureInputRef,
    handleSignatureChange,
    handleDeleteSignature,
    handleSaveProfile,
  };
}

export type ProfileSettings = ReturnType<typeof useProfileSettings>;
