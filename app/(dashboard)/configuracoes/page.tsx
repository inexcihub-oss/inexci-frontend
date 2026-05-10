"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
import { notificationService } from "@/services/notification.service";
import { uploadService } from "@/services/upload.service";
import { doctorHeaderService } from "@/services/doctor-header.service";
import { clearAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import type { DoctorHeader } from "@/types/doctor-header.types";
import { BillingSection } from "@/components/billing/BillingSection";
import { removeBackground } from "@/lib/utils";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
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
} from "lucide-react";
import { PrivacySection } from "@/components/privacy/PrivacySection";

// Tipos
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  document: string;
  birthDate: string;
  gender: string;
  // Campos específicos do médico (lidos de doctor_profile)
  specialty?: string;
  crm?: string;
  crmState?: string;
  signatureImageUrl?: string;
  // Flags
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
}

// Tabs da página
type SettingsTab =
  | "profile"
  | "notifications"
  | "plan"
  | "security"
  | "header"
  | "privacy";

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

// Componente de Tab
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

// Componente de Toggle/Switch
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
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

// Componente de Notification Item
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
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ConfiguracoesPageInner() {
  const { user, updateUser, isAdmin } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const searchParams = useSearchParams();

  const initialTab = (): SettingsTab => {
    const tab = searchParams.get("tab");
    if (
      tab === "header" ||
      tab === "profile" ||
      tab === "notifications" ||
      tab === "plan" ||
      tab === "security" ||
      tab === "privacy"
    ) {
      return tab as SettingsTab;
    }
    return "profile";
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Estados do perfil
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Estados de notificações
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    whatsappNotifications: true,
    newSurgeryRequest: true,
    statusUpdate: true,
    pendencies: true,
    expiringDocuments: true,
    weeklyReport: false,
  });

  // Estados de segurança
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );

  // Erros do perfil (após validar Zod)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {},
  );

  // Estados do cabeçalho customizado
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [currentHeader, setCurrentHeader] = useState<DoctorHeader | null>(null);
  const [headerLogoPreview, setHeaderLogoPreview] = useState<string | null>(
    null,
  );
  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [headerLogoDeleted, setHeaderLogoDeleted] = useState(false);
  const [headerLogoPosition, setHeaderLogoPosition] = useState<
    "left" | "right"
  >("left");
  const [headerContentHtml, setHeaderContentHtml] = useState<string>("");
  const [savingHeader, setSavingHeader] = useState(false);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do usuário
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileData = await userService.getProfile();
        const dp = profileData.doctorProfile;
        setProfile({
          name: profileData.name || "",
          email: profileData.email || "",
          phone: maskPhone(profileData.phone || ""),
          document: maskCpf(profileData.document || ""),
          birthDate: profileData.birthDate
            ? new Date(profileData.birthDate).toISOString().split("T")[0]
            : "",
          gender: profileData.gender || "",
          specialty: dp?.specialty || "",
          crm: dp?.crm || "",
          crmState: dp?.crmState || "",
          signatureImageUrl: dp?.signatureUrl || "",
          isDoctor: profileData.isDoctor || false,
        });
        if (profileData.avatarUrl) {
          const url = profileData.avatarUrl;
          if (url.startsWith("http://") || url.startsWith("https://")) {
            setAvatarPreview(url);
          } else {
            try {
              const signedUrl = await uploadService.getSignedUrl(url);
              setAvatarPreview(signedUrl);
            } catch {
              // ignora erro de URL assinada
            }
          }
        }
        if (dp?.signatureUrl) {
          const sUrl = dp.signatureUrl;
          if (sUrl.startsWith("http://") || sUrl.startsWith("https://")) {
            setSignaturePreview(sUrl);
          } else {
            try {
              const signedUrl = await uploadService.getSignedUrl(sUrl);
              setSignaturePreview(signedUrl);
            } catch {
              // ignora erro de URL assinada
            }
          }
        }
      } catch (error) {
        logger.error("Erro ao carregar perfil:", error);
        // Fallback para dados do contexto
        if (user) {
          const dp = user.doctorProfile;
          setProfile({
            name: user.name || "",
            email: user.email || "",
            phone: maskPhone(user.phone || ""),
            document: "",
            birthDate: "",
            gender: "",
            specialty: dp?.specialty || "",
            crm: dp?.crm || "",
            crmState: dp?.crmState || "",
            isDoctor: user.isDoctor || false,
          });
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  // Carregar configurações de notificação
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
        });
      } catch (error) {
        logger.error("Erro ao carregar configurações de notificação:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotificationSettings();
  }, []);

  // Carregar cabeçalho customizado
  useEffect(() => {
    if (!profile.isDoctor) return;
    const loadHeader = async () => {
      setLoadingHeader(true);
      try {
        const header = await doctorHeaderService.get();
        setCurrentHeader(header);
        if (header) {
          setHeaderLogoPosition(header.logoPosition);
          setHeaderContentHtml(header.contentHtml || "");
          if (header.logoUrl) {
            const logoUrl = header.logoUrl;
            if (
              logoUrl.startsWith("http://") ||
              logoUrl.startsWith("https://")
            ) {
              setHeaderLogoPreview(logoUrl);
            } else {
              try {
                const signed = await uploadService.getSignedUrl(logoUrl);
                setHeaderLogoPreview(signed);
              } catch {
                setHeaderLogoPreview(null);
              }
            }
          }
        }
      } catch {
        // silencia erro
      } finally {
        setLoadingHeader(false);
      }
    };
    loadHeader();
  }, [profile.isDoctor]);


  // Handlers de upload
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
      // Remove o fundo localmente e guarda o arquivo processado.
      // O upload e o save só acontecem ao clicar em "Salvar Alterações".
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
    // Apenas marca como deletada localmente.
    // A remoção real no backend/Storage ocorre ao clicar em "Salvar Alterações".
    setSignatureFile(null);
    setSignaturePreview(null);
    setSignatureDeleted(true);
  };

  // Salvar perfil
  const handleSaveProfile = async () => {
    // Validação Zod antes de qualquer side-effect
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
      // 1. Se há novo avatar, fazer upload primeiro
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

      // 2. Se há nova assinatura pendente, fazer upload
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

      // 3. Salvar dados básicos do perfil (telefone e CPF desmascarados)
      const phoneDigits = unmask(profile.phone);
      const documentDigits = unmask(profile.document);
      await userService.updateProfile({
        name: profile.name.trim(),
        phone: phoneDigits || undefined,
        document: documentDigits || undefined,
        birthDate: profile.birthDate || undefined,
        gender: profile.gender || undefined,
        ...(avatarFile
          ? { avatarUrl }
          : { avatarUrl: avatarPreview ? undefined : undefined }),
        ...(signatureFile
          ? { signatureUrl: signaturePath }
          : signatureDeleted
            ? { signatureUrl: undefined }
            : {}),
      });

      // 4. Se é médico, salvar dados profissionais (usa user.id, não doctorProfile.id)
      if (profile.isDoctor && user?.id) {
        await userService.updateDoctorProfile(user.id, {
          crm: profile.crm || undefined,
          crmState: profile.crmState || undefined,
          specialty: profile.specialty || undefined,
        });
      }

      await updateUser();
      setAvatarFile(null);
      setSignatureFile(null);
      setSignatureDeleted(false);

      // Atualiza cache do avatar após salvar
      if (user?.id) {
        if (!avatarPreview) {
          // Avatar removido — limpa o cache
          clearAvatarCache(user.id);
        } else if (avatarUrl && avatarResolvedUrl) {
          // Novo avatar enviado — armazena path → URL resolvida no cache
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

  // Salvar notificações
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
      });
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

  // Alterar senha
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

  // Handlers do cabeçalho
  const handleHeaderLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("A logo deve ter no máximo 2MB", "error");
      return;
    }
    setHeaderLogoFile(file);
    setHeaderLogoDeleted(false);
    const reader = new FileReader();
    reader.onloadend = () => setHeaderLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDeleteHeaderLogo = () => {
    setHeaderLogoFile(null);
    setHeaderLogoPreview(null);
    setHeaderLogoDeleted(true);
    if (headerLogoInputRef.current) headerLogoInputRef.current.value = "";
  };

  const handleSaveHeader = async () => {
    setSavingHeader(true);
    try {
      let logoPath: string | null = currentHeader?.logoUrl ?? null;

      if (headerLogoFile) {
        const result = await uploadService.uploadSingle(
          headerLogoFile,
          "headers",
        );
        logoPath = result.data.path;
      } else if (headerLogoDeleted) {
        logoPath = null;
      }

      const saved = await doctorHeaderService.upsert({
        logoUrl: logoPath,
        logoPosition: headerLogoPosition,
        contentHtml: headerContentHtml || null,
      });
      setCurrentHeader(saved);
      setHeaderLogoDeleted(false);
      setHeaderLogoFile(null);
      showToast("Cabeçalho salvo com sucesso!", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Erro ao salvar cabeçalho"), "error");
    } finally {
      setSavingHeader(false);
    }
  };

  const handleDeleteHeader = async () => {
    setSavingHeader(true);
    try {
      await doctorHeaderService.remove();
      setCurrentHeader(null);
      setHeaderLogoPreview(null);
      setHeaderLogoFile(null);
      setHeaderLogoDeleted(false);
      setHeaderLogoPosition("left");
      setHeaderContentHtml("");
      showToast("Cabeçalho removido com sucesso!", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Erro ao remover cabeçalho"),
        "error",
      );
    } finally {
      setSavingHeader(false);
    }
  };

  // Render da aba de Cabeçalho
  const renderHeaderTab = () => {
    if (loadingHeader) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Upload da logo */}
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Logo do Cabeçalho
            </h3>
            <p className="text-sm text-gray-500">
              Imagem exibida no topo dos documentos (PNG, JPG). Máximo 2MB.
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-6">
              <div className="w-32 h-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                {headerLogoPreview ? (
                  <img
                    src={headerLogoPreview}
                    alt="Logo"
                    className="max-h-14 max-w-28 object-contain"
                  />
                ) : (
                  <LayoutTemplate className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => headerLogoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer upload
                  </Button>
                  {headerLogoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDeleteHeaderLogo}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remover logo
                    </Button>
                  )}
                </div>
                <input
                  ref={headerLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleHeaderLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posição da logo */}
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Posição da Logo
            </h3>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex gap-3">
              <button
                onClick={() => setHeaderLogoPosition("left")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                  headerLogoPosition === "left"
                    ? "bg-primary-50 border-primary-500 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300",
                )}
              >
                ← Esquerda
              </button>
              <button
                onClick={() => setHeaderLogoPosition("right")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                  headerLogoPosition === "right"
                    ? "bg-primary-50 border-primary-500 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300",
                )}
              >
                Direita →
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo texto livre */}
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Texto do Cabeçalho
            </h3>
            <p className="text-sm text-gray-500">
              Nome da clínica, endereço, telefone, especialidade, registros,
              etc.
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <RichTextEditor
              value={headerContentHtml}
              onChange={setHeaderContentHtml}
              placeholder="Digite o texto do cabeçalho..."
            />
          </CardContent>
        </Card>

        {/* Pré-visualização */}
        {(headerLogoPreview || headerContentHtml) && (
          <Card className="border border-gray-200 rounded-2xl">
            <CardHeader className="p-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Pré-visualização
              </h3>
              <p className="text-sm text-gray-500">
                Como o cabeçalho aparecerá nos documentos
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div
                className={cn(
                  "relative flex items-center",
                  headerLogoPosition === "right"
                    ? "flex-row-reverse"
                    : "flex-row",
                  headerLogoPreview ? "min-h-20" : "",
                )}
              >
                {headerLogoPreview && (
                  <img
                    src={headerLogoPreview}
                    alt="Logo"
                    className="max-h-20 max-w-48 object-contain relative z-10 flex-shrink-0"
                  />
                )}
                {headerContentHtml && (
                  <div
                    className={cn(
                      "text-xs text-gray-700 leading-relaxed text-center",
                      headerLogoPreview
                        ? "absolute inset-x-0 pointer-events-none"
                        : "flex-1",
                    )}
                    dangerouslySetInnerHTML={{ __html: headerContentHtml }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleSaveHeader}
            isLoading={savingHeader}
            className="min-h-[44px] rounded-xl"
          >
            Salvar Alterações
          </Button>
          {currentHeader && (
            <Button
              variant="outline"
              onClick={handleDeleteHeader}
              isLoading={savingHeader}
              className="min-h-[44px] rounded-xl text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remover cabeçalho
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render da aba de Perfil
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
        {/* Foto do perfil */}
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

        {/* Dados pessoais */}
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

        {/* Dados profissionais (apenas para médicos) */}
        {profile.isDoctor && (
          <Card className="border border-gray-200 rounded-2xl">
            <CardHeader className="p-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Dados Profissionais
              </h3>
              <p className="text-sm text-gray-500">
                Informações do registro médico
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Especialidade"
                  value={profile.specialty || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, specialty: e.target.value })
                  }
                  placeholder="Ex: Ortopedia"
                />
                <Input
                  label="CRM"
                  value={profile.crm || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, crm: e.target.value })
                  }
                  placeholder="00000"
                />
                <Select
                  label="UF do CRM"
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

        {/* Assinatura digital (apenas para médicos) */}
        {profile.isDoctor && (
          <Card className="border border-gray-200 rounded-2xl">
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

        {/* Botão salvar */}
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

  // Render da aba de Notificações
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
        {/* Canais de notificação */}
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

        {/* Tipos de notificação */}
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
          </CardContent>
        </Card>

        {/* Botão salvar */}
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

  // Render da aba de Privacidade
  const renderPrivacyTab = () => <PrivacySection />;

  // Render da aba de Segurança
  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Alterar senha */}
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="ds-page-title">Configurações</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        {/* Layout com sidebar e conteúdo */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar de navegação */}
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
              {isAdmin && (
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
            </nav>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && renderProfileTab()}
            {activeTab === "notifications" && renderNotificationsTab()}
            {activeTab === "plan" && isAdmin && renderPlanTab()}
            {activeTab === "security" && renderSecurityTab()}
            {activeTab === "header" && profile.isDoctor && renderHeaderTab()}
            {activeTab === "privacy" && renderPrivacyTab()}
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
