"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { cn } from "@/lib/utils";
import { GENDER_OPTIONS, STATE_UF_OPTIONS } from "@/lib/options";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  changePasswordSchema,
  profileSchema,
} from "@/lib/schemas/configuracoes.schema";
import { logger } from "@/lib/logger";
import { unmask } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import PasswordInput from "@/components/ui/PasswordInput";
import api from "@/lib/api";
import { userService } from "@/services/user.service";
import {
  buildAvatarUpdate,
  buildOwnDoctorProfilePayload,
  type OwnDoctorProfileFields,
} from "@/lib/collaborator-update";
import {
  notificationService,
  type PatientNotificationSettings,
} from "@/services/notification.service";
import { uploadService } from "@/services/upload.service";
import {
  COUNCIL_OPTIONS,
  councilOf,
  ProfessionalCouncil,
} from "@/lib/professional-council";
import { clearAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import dynamic from "next/dynamic";
const BillingSection = dynamic(
  () =>
    import("@/components/billing/BillingSection").then((m) => m.BillingSection),
  { ssr: false },
);
import { removeBackground } from "@/lib/utils";
import { DoctorHeaderEditor } from "@/components/shared/DoctorHeaderEditor";
import { useDoctorHeaderEditor } from "@/hooks/useDoctorHeaderEditor";
import {
  User,
  Camera,
  Bell,
  CreditCard,
  Shield,
  ShieldCheck,
  FileSignature,
  Upload,
  X,
  Mail,
  MessageSquare,
  Loader2,
  LayoutTemplate,
  Compass,
  FileText,
  CalendarClock,
  CalendarOff,
  CalendarCheck,
  CalendarX,
  BellRing,
} from "lucide-react";
import { OnboardingSettingsTab } from "@/components/onboarding/OnboardingSettingsTab";
import { PrivacySection } from "@/components/privacy/PrivacySection";
import { DocumentTemplatesSettings } from "@/components/clinical/DocumentTemplatesSettings";
import { ScheduleWeekEditor } from "@/components/availability/ScheduleWeekEditor";
import { HolidaysSettings } from "@/components/availability/HolidaysSettings";
import { Permission } from "@/lib/permissions";

interface UserProfile {
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

interface NotificationSettings {
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
  mentionEmails: boolean;
}

type SettingsTab =
  | "profile"
  | "notifications"
  | "plan"
  | "security"
  | "header"
  | "privacy"
  | "onboarding"
  | "document-templates"
  | "my-schedule"
  | "holidays";

import { maskPhone, maskCpf } from "@/lib/masks";

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  document: "CPF",
};

const PASSWORD_FIELD_LABELS: Record<string, string> = {
  currentPassword: "Senha atual",
  newPassword: "Nova senha",
  confirmPassword: "Confirmar nova senha",
};

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left whitespace-nowrap min-h-[44px] active:scale-[0.98]",
        active
          ? "bg-primary-50 text-primary-700 border border-primary-200"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary-600" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function NotificationItem({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 min-h-[56px]">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gray-100 rounded-xl">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={title} />
    </div>
  );
}

const BILLING_TAB_ENABLED = true;

interface SettingsTabAccess {
  isAccountOwner: boolean;
  emiteDocumentos: boolean;
  isDoctor: boolean;
  podeAdministrar: boolean;
  hasUser: boolean;
}

function resolveSettingsTab(
  tab: string | null,
  acesso: SettingsTabAccess,
): SettingsTab | null {
  if (tab === "plan" && !acesso.isAccountOwner) return "profile";
  if (
    tab === "document-templates" &&
    !(acesso.emiteDocumentos && acesso.hasUser)
  )
    return "profile";
  if (tab === "my-schedule" && !(acesso.isDoctor && acesso.hasUser))
    return "profile";
  if (tab === "holidays" && !acesso.podeAdministrar) return "profile";
  if (
    tab === "header" ||
    tab === "profile" ||
    tab === "notifications" ||
    tab === "plan" ||
    tab === "security" ||
    tab === "privacy" ||
    tab === "onboarding" ||
    tab === "document-templates" ||
    tab === "my-schedule" ||
    tab === "holidays"
  ) {
    return tab as SettingsTab;
  }
  return null;
}

function ConfiguracoesPageInner() {
  const {
    user,
    updateUser,
    isAccountOwner,
    canIssueClinicalDocuments,
    isDoctor,
    can,
    subscription,
    refreshSubscription,
  } = useAuth();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get("checkout");
  const checkoutMessageShownRef = useRef(false);
  const checkoutPollingStartedRef = useRef(false);
  const checkoutPollingFinishedRef = useRef(false);

  const clearCheckoutParamFromUrl = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("checkout")) return;
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  };

  const podeAdministrar = can(Permission.ADMINISTRACAO);
  const hasUser = !!user?.id;
  const acessoAbas: SettingsTabAccess = {
    isAccountOwner,
    emiteDocumentos: canIssueClinicalDocuments,
    isDoctor,
    podeAdministrar,
    hasUser,
  };
  const initialTab = (): SettingsTab =>
    resolveSettingsTab(searchParams.get("tab"), acessoAbas) ?? "profile";

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const resolvido = resolveSettingsTab(tab, {
      isAccountOwner,
      emiteDocumentos: canIssueClinicalDocuments,
      isDoctor,
      podeAdministrar,
      hasUser,
    });
    if (resolvido) setActiveTab(resolvido);
  }, [
    searchParams,
    isAccountOwner,
    canIssueClinicalDocuments,
    isDoctor,
    podeAdministrar,
    hasUser,
  ]);

  useEffect(() => {
    if (!checkoutParam || checkoutMessageShownRef.current) return;

    if (checkoutParam === "success") {
      checkoutMessageShownRef.current = true;
      showToast(
        "Assinatura ativada! Pode levar alguns segundos para refletir.",
        "success",
      );
      setActiveTab("plan");
    } else if (checkoutParam === "cancel") {
      checkoutMessageShownRef.current = true;
      showToast("Checkout cancelado. Você pode assinar quando quiser.", "info");
      setActiveTab("plan");
      clearCheckoutParamFromUrl();
    }
  }, [checkoutParam, showToast]);

  useEffect(() => {
    if (checkoutParam !== "success") return;
    if (checkoutPollingFinishedRef.current || checkoutPollingStartedRef.current)
      return;

    const status = subscription?.subscription.status;
    const stillBlocked = status === "canceled" || status === "suspended";

    if (!stillBlocked) {
      checkoutPollingFinishedRef.current = true;
      clearCheckoutParamFromUrl();
      return;
    }

    checkoutPollingStartedRef.current = true;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      await refreshSubscription();

      if (attempts >= maxAttempts) {
        checkoutPollingFinishedRef.current = true;
        clearInterval(intervalId);
        clearCheckoutParamFromUrl();
        showToast(
          "Pagamento confirmado, mas a atualização ainda está processando. Aguarde alguns instantes e recarregue a página.",
          "info",
        );
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 2500);

    void poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    checkoutParam,
    subscription?.subscription.status,
    refreshSubscription,
    showToast,
  ]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    document: "",
    birthDate: "",
    gender: "",
    specialty: "",
    crm: "",
    crmState: "",
  });
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

  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    whatsappNotifications: true,
    newSurgeryRequest: true,
    statusUpdate: true,
    pendencies: true,
    expiringDocuments: true,
    weeklyReport: false,
    mentionEmails: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {},
  );

  const {
    loadingHeader,
    savingHeader,
    currentHeader,
    headerLogoPreview,
    headerLogoPosition,
    headerContentHtml,
    headerLogoInputRef,
    setHeaderLogoPosition,
    setHeaderContentHtml,
    handleHeaderLogoChange,
    handleDeleteHeaderLogo,
    handleSaveHeader,
    handleDeleteHeader,
  } = useDoctorHeaderEditor({
    enabled: !!profile.isDoctor,
    mode: "self",
    showToast,
    formatError: (error, fallback) => getApiErrorMessage(error, fallback),
  });

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
        if (profileData.avatarUrl) {
          const url = profileData.avatarUrl;
          if (url.startsWith("http://") || url.startsWith("https://")) {
            if (isMounted) setAvatarPreview(url);
          } else {
            try {
              const signedUrl = await uploadService.getSignedUrl(url);
              if (isMounted) setAvatarPreview(signedUrl);
            } catch {
            }
          }
        }
        if (dp?.signatureUrl) {
          const sUrl = dp.signatureUrl;
          if (sUrl.startsWith("http://") || sUrl.startsWith("https://")) {
            if (isMounted) setSignaturePreview(sUrl);
          } else {
            try {
              const signedUrl = await uploadService.getSignedUrl(sUrl);
              if (isMounted) setSignaturePreview(signedUrl);
            } catch {
            }
          }
        }
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

  const [patientNotifications, setPatientNotifications] =
    useState<PatientNotificationSettings | null>(null);

  useEffect(() => {
    if (!podeAdministrar) {
      setPatientNotifications(null);
      return;
    }
    let ativo = true;
    notificationService
      .getPatientSettings()
      .then((settings) => {
        if (ativo) setPatientNotifications(settings);
      })
      .catch((error) => {
        logger.error("Erro ao carregar avisos aos pacientes:", error);
      });
    return () => {
      ativo = false;
    };
  }, [podeAdministrar]);

  useEffect(() => {
    const loadNotificationSettings = async () => {
      setLoadingNotifications(true);
      try {
        const settings = await notificationService.getSettings();
        setNotifications({
          pushNotifications: settings.pushNotifications,
          whatsappNotifications: settings.whatsappNotifications,
          newSurgeryRequest: settings.newSurgeryRequest,
          statusUpdate: settings.statusUpdate,
          pendencies: settings.pendencies,
          expiringDocuments: settings.expiringDocuments,
          weeklyReport: settings.weeklyReport,
          mentionEmails: settings.mentionEmails ?? true,
        });
      } catch (error) {
        logger.error("Erro ao carregar configurações de notificação:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotificationSettings();
  }, []);

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
      const errs: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !errs[field]) errs[field] = issue.message;
      }
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
          queryKey: ["surgery-request"],
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

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await notificationService.updateSettings({
        pushNotifications: notifications.pushNotifications,
        whatsappNotifications: notifications.whatsappNotifications,
        newSurgeryRequest: notifications.newSurgeryRequest,
        statusUpdate: notifications.statusUpdate,
        pendencies: notifications.pendencies,
        expiringDocuments: notifications.expiringDocuments,
        weeklyReport: notifications.weeklyReport,
        mentionEmails: notifications.mentionEmails,
      });
      if (podeAdministrar && patientNotifications) {
        setPatientNotifications(
          await notificationService.updatePatientSettings(patientNotifications),
        );
      }
      showToast("Configurações de notificação atualizadas!", "success");
    } catch (error: unknown) {
      showToast(
        getApiErrorMessage(error, "Erro ao atualizar configurações"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const result = changePasswordSchema.safeParse(passwordData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !errs[field]) errs[field] = issue.message;
      }
      setPasswordErrors(errs);
      showToast(summarizeErrors(errs, PASSWORD_FIELD_LABELS), "error");
      return;
    }
    setPasswordErrors({});
    setSaving(true);
    try {
      await api.put("/auth/changePassword", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showToast("Senha alterada com sucesso!", "success");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, "Erro ao alterar senha"), "error");
    } finally {
      setSaving(false);
    }
  };

  const updatePasswordField = (
    field: keyof typeof passwordData,
    value: string,
  ) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => {
        const { [field]: _omit, ...rest } = prev;
        return rest;
      });
    }
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

  const renderHeaderTab = () => (
    <DoctorHeaderEditor
      loading={loadingHeader}
      saving={savingHeader}
      currentHeader={currentHeader}
      logoPreview={headerLogoPreview}
      logoPosition={headerLogoPosition}
      contentHtml={headerContentHtml}
      logoInputRef={headerLogoInputRef}
      onLogoChange={handleHeaderLogoChange}
      onDeleteLogo={handleDeleteHeaderLogo}
      onLogoPositionChange={setHeaderLogoPosition}
      onContentHtmlChange={setHeaderContentHtml}
      onSave={handleSaveHeader}
      onDeleteHeader={handleDeleteHeader}
      saveLabel="Salvar Alterações"
    />
  );

  const renderProfileTab = () => {
    if (loadingProfile) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Foto do Perfil
            </h3>
            <p className="text-sm text-gray-500">
              Esta foto será exibida em seu perfil e nas comunicações
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer upload
                </Button>
                {avatarPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarFile(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  JPG, PNG ou GIF. Máximo 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Dados Pessoais
            </h3>
            <p className="text-sm text-gray-500">
              Informações básicas do seu perfil
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                value={profile.name}
                onChange={(e) => updateProfileField("name", e.target.value)}
                required
                error={profileErrors.name}
              />
              <Input
                label="E-mail"
                type="email"
                value={profile.email}
                onChange={(e) => updateProfileField("email", e.target.value)}
                required
                error={profileErrors.email}
              />
              <Input
                label="Telefone"
                mask="phone"
                value={profile.phone}
                onChange={(e) => updateProfileField("phone", e.target.value)}
                placeholder="(00) 00000-0000"
                error={profileErrors.phone}
              />
              <Input
                label="CPF"
                mask="cpf"
                value={profile.document}
                onChange={(e) => updateProfileField("document", e.target.value)}
                placeholder="000.000.000-00"
                error={profileErrors.document}
              />
              <DateInput
                label="Data de nascimento"
                value={profile.birthDate}
                onChange={(v) => setProfile({ ...profile, birthDate: v })}
              />
              <Select
                label="Gênero"
                value={profile.gender}
                onChange={(e) =>
                  setProfile({ ...profile, gender: e.target.value })
                }
                options={GENDER_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {profile.isDoctor && (
          <Card className="border border-gray-200 rounded-2xl">
            <CardHeader className="p-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Dados Profissionais
              </h3>
              <p className="text-sm text-gray-500">
                Informações do registro profissional
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isAccountOwner ? (
                  <Select
                    label="Conselho"
                    value={profile.council ?? "CRM"}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        council: e.target.value as ProfessionalCouncil,
                      })
                    }
                    options={COUNCIL_OPTIONS}
                  />
                ) : (
                  <Input
                    label="Conselho"
                    value={
                      COUNCIL_OPTIONS.find(
                        (opt) => opt.value === (profile.council ?? "CRM"),
                      )?.label ?? "CRM"
                    }
                    disabled
                    readOnly
                    title="Para trocar o conselho, fale com a administração da conta."
                  />
                )}
                <Input
                  label="Especialidade"
                  value={profile.specialty || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, specialty: e.target.value })
                  }
                  placeholder="Ex: Ortopedia"
                />
                <Input
                  label="Número no conselho"
                  value={profile.crm || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, crm: e.target.value })
                  }
                  placeholder="00000"
                />
                <Select
                  label="UF do conselho"
                  value={profile.crmState || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, crmState: e.target.value })
                  }
                  options={STATE_UF_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {profile.isDoctor && (
          <Card
            data-tour="config-assinatura"
            className="border border-gray-200 rounded-2xl"
          >
            <CardHeader className="p-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                Assinatura Digital
              </h3>
              <p className="text-sm text-gray-500">
                Faça upload da sua assinatura para documentos e laudos
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isProcessingSignature ? (
                <div className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  <p className="text-sm text-gray-500">
                    Processando assinatura...
                  </p>
                </div>
              ) : (
                <div
                  onClick={() =>
                    !isProcessingSignature && signatureInputRef.current?.click()
                  }
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    signaturePreview
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-300 hover:border-primary-400 hover:bg-gray-50",
                  )}
                >
                  {signaturePreview ? (
                    <div className="relative">
                      <Image
                        src={signaturePreview}
                        alt="Assinatura"
                        width={300}
                        height={100}
                        className="mx-auto object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSignature();
                        }}
                        className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        Clique para fazer upload da assinatura
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG ou JPG. O fundo será removido automaticamente.
                        Máximo 2MB.
                      </p>
                    </>
                  )}
                </div>
              )}
              {(signatureFile || signatureDeleted) &&
                !isProcessingSignature && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <span>⚠</span>{" "}
                    {signatureDeleted
                      ? 'Remoção pendente — clique em "Salvar Alterações" para confirmar.'
                      : 'Assinatura ainda não salva — clique em "Salvar Alterações" para confirmar.'}
                  </p>
                )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleSignatureChange}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button
            onClick={handleSaveProfile}
            isLoading={saving}
            className="min-h-[44px] rounded-xl"
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => {
    if (loadingNotifications) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Canais de Notificação
            </h3>
            <p className="text-sm text-gray-500">
              Escolha como deseja receber as notificações
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <NotificationItem
              icon={Bell}
              title="Notificações na plataforma"
              description="Receba alertas em tempo real dentro da plataforma"
              checked={notifications.pushNotifications}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  pushNotifications: checked,
                })
              }
            />
            <NotificationItem
              icon={MessageSquare}
              title="Notificações por WhatsApp"
              description="Receba alertas importantes via WhatsApp"
              checked={notifications.whatsappNotifications}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  whatsappNotifications: checked,
                })
              }
            />
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Tipos de Notificação
            </h3>
            <p className="text-sm text-gray-500">
              Personalize quais notificações deseja receber
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <NotificationItem
              icon={MessageSquare}
              title="Novas Solicitações"
              description="Quando uma nova solicitação cirúrgica for criada"
              checked={notifications.newSurgeryRequest}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  newSurgeryRequest: checked,
                })
              }
            />
            <NotificationItem
              icon={Bell}
              title="Atualizações de Status"
              description="Quando o status de uma solicitação for alterado"
              checked={notifications.statusUpdate}
              onChange={(checked) =>
                setNotifications({ ...notifications, statusUpdate: checked })
              }
            />
            <NotificationItem
              icon={Bell}
              title="Pendências"
              description="Quando houver pendências a serem resolvidas"
              checked={notifications.pendencies}
              onChange={(checked) =>
                setNotifications({ ...notifications, pendencies: checked })
              }
            />
            <NotificationItem
              icon={Bell}
              title="Documentos Expirando"
              description="Quando documentos estiverem próximos do vencimento"
              checked={notifications.expiringDocuments}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  expiringDocuments: checked,
                })
              }
            />
            <NotificationItem
              icon={Mail}
              title="Resumo semanal por e-mail"
              description="Receba toda segunda-feira um e-mail com o resumo das suas solicitações cirúrgicas"
              checked={notifications.weeklyReport}
              onChange={(checked) =>
                setNotifications({ ...notifications, weeklyReport: checked })
              }
            />
            <NotificationItem
              icon={Mail}
              title="Menções por e-mail"
              description="Receba um e-mail quando alguém mencionar você num comentário e a notificação não for lida em 10 minutos"
              checked={notifications.mentionEmails}
              onChange={(checked) =>
                setNotifications({ ...notifications, mentionEmails: checked })
              }
            />
          </CardContent>
        </Card>

        {podeAdministrar && patientNotifications && (
          <Card className="border border-gray-200 rounded-2xl">
            <CardHeader className="p-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Avisos aos pacientes
              </h3>
              <p className="text-sm text-gray-500">
                Mensagens automáticas enviadas aos pacientes. Vale para toda a
                clínica.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <NotificationItem
                icon={CalendarCheck}
                title="Consulta agendada"
                description="WhatsApp ao paciente quando a consulta é marcada, remarcada ou reativada"
                checked={patientNotifications.appointmentScheduled}
                onChange={(checked) =>
                  setPatientNotifications({
                    ...patientNotifications,
                    appointmentScheduled: checked,
                  })
                }
              />
              <NotificationItem
                icon={BellRing}
                title="Lembrete e confirmação de consulta"
                description="E-mail e WhatsApp 24 horas antes, com as opções de confirmar ou cancelar"
                checked={patientNotifications.appointmentReminder}
                onChange={(checked) =>
                  setPatientNotifications({
                    ...patientNotifications,
                    appointmentReminder: checked,
                  })
                }
              />
              <NotificationItem
                icon={CalendarX}
                title="Consulta cancelada"
                description="WhatsApp ao paciente quando a consulta é cancelada"
                checked={patientNotifications.appointmentCancelled}
                onChange={(checked) =>
                  setPatientNotifications({
                    ...patientNotifications,
                    appointmentCancelled: checked,
                  })
                }
              />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSaveNotifications}
            isLoading={saving}
            className="min-h-[44px] rounded-xl"
          >
            Salvar Preferências
          </Button>
        </div>
      </div>
    );
  };

  const renderPlanTab = () => <BillingSection />;

  const renderPrivacyTab = () => <PrivacySection />;

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Alterar Senha
          </h3>
          <p className="text-sm text-gray-500">
            Mantenha sua conta segura com uma senha forte
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4 max-w-md">
            <PasswordInput
              label="Senha atual"
              value={passwordData.currentPassword}
              onChange={(e) =>
                updatePasswordField("currentPassword", e.target.value)
              }
              required
              error={passwordErrors.currentPassword}
            />
            <PasswordInput
              label="Nova senha"
              showRequirements
              value={passwordData.newPassword}
              onChange={(e) =>
                updatePasswordField("newPassword", e.target.value)
              }
              required
              error={passwordErrors.newPassword}
            />
            <PasswordInput
              label="Confirmar nova senha"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                updatePasswordField("confirmPassword", e.target.value)
              }
              required
              error={passwordErrors.confirmPassword}
            />
            <Button
              onClick={handleChangePassword}
              isLoading={saving}
              className="min-h-[44px] rounded-xl"
            >
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <PageContainer>
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="ds-page-title">Configurações</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full lg:w-64 shrink-0">
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0">
              <TabButton
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
                icon={User}
                label="Perfil"
              />
              <TabButton
                active={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
                icon={Bell}
                label="Notificações"
              />
              {isAccountOwner && BILLING_TAB_ENABLED && (
                <TabButton
                  active={activeTab === "plan"}
                  onClick={() => setActiveTab("plan")}
                  icon={CreditCard}
                  label="Plano e Faturamento"
                />
              )}
              {profile.isDoctor && (
                <TabButton
                  active={activeTab === "header"}
                  onClick={() => setActiveTab("header")}
                  icon={LayoutTemplate}
                  label="Cabeçalho de Documentos"
                />
              )}
              {isDoctor && user?.id && (
                <TabButton
                  active={activeTab === "my-schedule"}
                  onClick={() => setActiveTab("my-schedule")}
                  icon={CalendarClock}
                  label="Minha Agenda"
                />
              )}
              {can(Permission.ADMINISTRACAO) && (
                <TabButton
                  active={activeTab === "holidays"}
                  onClick={() => setActiveTab("holidays")}
                  icon={CalendarOff}
                  label="Feriados"
                />
              )}
              {canIssueClinicalDocuments && user?.id && (
                <TabButton
                  active={activeTab === "document-templates"}
                  onClick={() => setActiveTab("document-templates")}
                  icon={FileText}
                  label="Modelos de Documentos"
                />
              )}
              <TabButton
                active={activeTab === "security"}
                onClick={() => setActiveTab("security")}
                icon={Shield}
                label="Segurança"
              />
              <TabButton
                active={activeTab === "privacy"}
                onClick={() => setActiveTab("privacy")}
                icon={ShieldCheck}
                label="Privacidade e Termos"
              />
              <TabButton
                active={activeTab === "onboarding"}
                onClick={() => setActiveTab("onboarding")}
                icon={Compass}
                label="Primeiros passos"
              />
            </nav>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === "profile" && renderProfileTab()}
            {activeTab === "notifications" && renderNotificationsTab()}
            {activeTab === "plan" &&
              isAccountOwner &&
              BILLING_TAB_ENABLED &&
              renderPlanTab()}
            {activeTab === "security" && renderSecurityTab()}
            {activeTab === "header" && profile.isDoctor && renderHeaderTab()}
            {activeTab === "privacy" && renderPrivacyTab()}
            {activeTab === "my-schedule" && isDoctor && user?.id && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6 flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Minha agenda
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Dias e horários em que você atende. A recepção vê esses
                    horários ao agendar e é avisada quando marca fora deles.
                  </p>
                </div>
                <ScheduleWeekEditor doctorId={user.id} />
              </div>
            )}
            {activeTab === "holidays" && can(Permission.ADMINISTRACAO) && (
              <HolidaysSettings />
            )}
            {activeTab === "document-templates" &&
              canIssueClinicalDocuments &&
              user?.id && <DocumentTemplatesSettings doctorId={user.id} />}
            {activeTab === "onboarding" && <OnboardingSettingsTab />}
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense>
      <ConfiguracoesPageInner />
    </Suspense>
  );
}
