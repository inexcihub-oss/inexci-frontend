"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  profileSchema,
  changePasswordSchema,
} from "@/lib/schemas/configuracoes.schema";
import api from "@/lib/api";
import { userService } from "@/services/user.service";
import { notificationService } from "@/services/notification.service";
import { uploadService } from "@/services/upload.service";
import { authService } from "@/services/auth.service";
import type { SubscriptionPlan } from "@/types";
import { removeBackground } from "@/lib/utils";
import {
  User,
  Camera,
  Bell,
  CreditCard,
  Shield,
  FileSignature,
  Upload,
  X,
  Mail,
  Smartphone,
  MessageSquare,
  Loader2,
} from "lucide-react";

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
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
}

// Tabs da página
type SettingsTab = "profile" | "notifications" | "plan" | "security";

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

// Componente de Plan Card
function PlanCard({
  plan,
  isCurrentPlan,
}: {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
}) {
  return (
    <div
      className={cn(
        "relative border rounded-2xl p-6 transition-all",
        isCurrentPlan
          ? "bg-primary-50 border-primary-500 shadow-lg shadow-primary-100"
          : "border-gray-200",
      )}
    >
      {isCurrentPlan && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
          Plano Atual
        </span>
      )}
      <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
      <div className="mt-4 mb-4">
        <span className="text-sm text-gray-700 font-medium">
          Até {plan.max_doctors} {plan.max_doctors === 1 ? "médico" : "médicos"}
        </span>
      </div>
      <Button
        variant={isCurrentPlan ? "outline" : "primary"}
        className="w-full"
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? "Plano Atual" : "Fale Conosco"}
      </Button>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { user, updateUser, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
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
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Estados de notificações
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    newSurgeryRequest: true,
    statusUpdate: true,
    pendencies: true,
    expiringDocuments: true,
    weeklyReport: false,
  });

  // Estados do plano
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Estados de segurança
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Carregar dados do usuário
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileData = await userService.getProfile();
        const dp = profileData.doctor_profile;
        setProfile({
          name: profileData.name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          document: profileData.document || "",
          birthDate: profileData.birth_date
            ? new Date(profileData.birth_date).toISOString().split("T")[0]
            : "",
          gender: profileData.gender || "",
          specialty: dp?.specialty || "",
          crm: dp?.crm || "",
          crmState: dp?.crm_state || "",
          signatureImageUrl: dp?.signature_url || "",
          isDoctor: profileData.is_doctor || false,
        });
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
        if (dp?.signature_url) {
          setSignaturePreview(dp.signature_url);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        // Fallback para dados do contexto
        if (user) {
          const dp = user.doctor_profile;
          setProfile({
            name: user.name || "",
            email: user.email || "",
            phone: "",
            document: "",
            birthDate: "",
            gender: "",
            specialty: dp?.specialty || "",
            crm: dp?.crm || "",
            crmState: dp?.crm_state || "",
            isDoctor: user.is_doctor || false,
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
          emailNotifications: settings.email_notifications,
          smsNotifications: settings.sms_notifications,
          pushNotifications: settings.push_notifications,
          newSurgeryRequest: settings.new_surgery_request,
          statusUpdate: settings.status_update,
          pendencies: settings.pendencies,
          expiringDocuments: settings.expiring_documents,
          weeklyReport: settings.weekly_report,
        });
      } catch (error) {
        console.error("Erro ao carregar configurações de notificação:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotificationSettings();
  }, []);

  // Carregar planos de assinatura
  useEffect(() => {
    const loadPlans = async () => {
      if (!isAdmin) return;
      setLoadingPlans(true);
      try {
        const data = await authService.getPlans();
        setPlans(data);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [isAdmin]);

  // Handlers de upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("A imagem deve ter no máximo 5MB", "error");
        return;
      }
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
    setIsUploadingSignature(true);
    try {
      const file = await removeBackground(rawFile);
      const result = await uploadService.uploadSingle(file, "signatures");
      const { url: signedUrl, path } = result.data;
      await userService.updateProfile({ signature_url: path });
      setSignaturePreview(signedUrl);
      await updateUser();
      showToast("Assinatura salva com sucesso", "success");
    } catch {
      showToast("Erro ao salvar assinatura", "error");
    } finally {
      setIsUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  const handleDeleteSignature = async () => {
    setIsUploadingSignature(true);
    try {
      await userService.updateProfile({ signature_url: undefined });
      setSignaturePreview(null);
      await updateUser();
      showToast("Assinatura removida", "success");
    } catch {
      showToast("Erro ao remover assinatura", "error");
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // Salvar perfil
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // 1. Salvar dados básicos do perfil
      await userService.updateProfile({
        name: profile.name,
        phone: profile.phone || undefined,
        document: profile.document || undefined,
        birth_date: profile.birthDate || undefined,
        gender: profile.gender || undefined,
        avatar_url: avatarPreview || undefined,
      });

      // 2. Se é médico e tem doctor_profile, salvar dados profissionais
      if (profile.isDoctor && user?.doctor_profile?.id) {
        await userService.updateDoctorProfile(user.doctor_profile.id, {
          crm: profile.crm || undefined,
          crm_state: profile.crmState || undefined,
          specialty: profile.specialty || undefined,
        });
      }

      await updateUser();
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
        email_notifications: notifications.emailNotifications,
        sms_notifications: notifications.smsNotifications,
        push_notifications: notifications.pushNotifications,
        new_surgery_request: notifications.newSurgeryRequest,
        status_update: notifications.statusUpdate,
        pendencies: notifications.pendencies,
        expiring_documents: notifications.expiringDocuments,
        weekly_report: notifications.weeklyReport,
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
      showToast(result.error.issues[0].message, "error");
      return;
    }
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
                    onClick={() => setAvatarPreview(null)}
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
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                required
              />
              <Input
                label="E-mail"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                required
              />
              <Input
                label="Telefone"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
              <Input
                label="CPF"
                value={profile.document}
                onChange={(e) =>
                  setProfile({ ...profile, document: e.target.value })
                }
                placeholder="000.000.000-00"
              />
              <Input
                label="Data de nascimento"
                type="date"
                value={profile.birthDate}
                onChange={(e) =>
                  setProfile({ ...profile, birthDate: e.target.value })
                }
              />
              <Select
                label="Gênero"
                value={profile.gender}
                onChange={(e) =>
                  setProfile({ ...profile, gender: e.target.value })
                }
                options={[
                  { value: "", label: "Selecione" },
                  { value: "M", label: "Masculino" },
                  { value: "F", label: "Feminino" },
                  { value: "O", label: "Outro" },
                ]}
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
                  options={[
                    { value: "", label: "Selecione" },
                    { value: "AC", label: "AC" },
                    { value: "AL", label: "AL" },
                    { value: "AP", label: "AP" },
                    { value: "AM", label: "AM" },
                    { value: "BA", label: "BA" },
                    { value: "CE", label: "CE" },
                    { value: "DF", label: "DF" },
                    { value: "ES", label: "ES" },
                    { value: "GO", label: "GO" },
                    { value: "MA", label: "MA" },
                    { value: "MT", label: "MT" },
                    { value: "MS", label: "MS" },
                    { value: "MG", label: "MG" },
                    { value: "PA", label: "PA" },
                    { value: "PB", label: "PB" },
                    { value: "PR", label: "PR" },
                    { value: "PE", label: "PE" },
                    { value: "PI", label: "PI" },
                    { value: "RJ", label: "RJ" },
                    { value: "RN", label: "RN" },
                    { value: "RS", label: "RS" },
                    { value: "RO", label: "RO" },
                    { value: "RR", label: "RR" },
                    { value: "SC", label: "SC" },
                    { value: "SP", label: "SP" },
                    { value: "SE", label: "SE" },
                    { value: "TO", label: "TO" },
                  ]}
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
              {isUploadingSignature ? (
                <div className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  <p className="text-sm text-gray-500">
                    Processando assinatura...
                  </p>
                </div>
              ) : (
                <div
                  onClick={() =>
                    !isUploadingSignature && signatureInputRef.current?.click()
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
              icon={Mail}
              title="Notificações por E-mail"
              description="Receba atualizações importantes no seu e-mail"
              checked={notifications.emailNotifications}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  emailNotifications: checked,
                })
              }
            />
            <NotificationItem
              icon={Smartphone}
              title="Notificações por SMS"
              description="Receba alertas urgentes via mensagem de texto"
              checked={notifications.smsNotifications}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  smsNotifications: checked,
                })
              }
            />
            <NotificationItem
              icon={Bell}
              title="Notificações Push"
              description="Receba notificações em tempo real no navegador"
              checked={notifications.pushNotifications}
              onChange={(checked) =>
                setNotifications({
                  ...notifications,
                  pushNotifications: checked,
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
              title="Relatório Semanal"
              description="Receba um resumo semanal das suas atividades"
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

  // Render da aba de Plano
  const currentPlan = plans.find((p) => p.id === user?.subscription_plan_id);

  const renderPlanTab = () => (
    <div className="space-y-6">
      {/* Plano atual */}
      {currentPlan && (
        <Card className="border border-gray-200 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 font-medium">
                  Seu plano atual
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {currentPlan.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPlan.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  Até {currentPlan.max_doctors}{" "}
                  {currentPlan.max_doctors === 1 ? "médico" : "médicos"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de planos */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {currentPlan ? "Planos Disponíveis" : "Escolha seu Plano"}
        </h3>
        {loadingPlans ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span className="ml-2 text-sm text-gray-500">
              Carregando planos...
            </span>
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum plano disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={user?.subscription_plan_id === plan.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Informação de contato para alteração de plano */}
      <Card className="border border-gray-200 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CreditCard className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Precisa alterar seu plano?
              </p>
              <p className="text-xs text-gray-500">
                Entre em contato com nosso time comercial para alterações no seu
                plano de assinatura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
            <Input
              label="Senha atual"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              required
            />
            <Input
              label="Nova senha"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              required
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
              <TabButton
                active={activeTab === "security"}
                onClick={() => setActiveTab("security")}
                icon={Shield}
                label="Segurança"
              />
            </nav>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && renderProfileTab()}
            {activeTab === "notifications" && renderNotificationsTab()}
            {activeTab === "plan" && isAdmin && renderPlanTab()}
            {activeTab === "security" && renderSecurityTab()}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
