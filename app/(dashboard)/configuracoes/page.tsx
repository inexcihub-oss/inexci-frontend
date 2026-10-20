"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  User,
  Bell,
  CreditCard,
  Shield,
  ShieldCheck,
  LayoutTemplate,
  Compass,
  FileText,
  CalendarClock,
  CalendarOff,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { Permission } from "@/lib/permissions";
import { OnboardingSettingsTab } from "@/components/onboarding/OnboardingSettingsTab";
import { PrivacySection } from "@/components/privacy/PrivacySection";
import { DocumentTemplatesSettings } from "@/components/clinical/DocumentTemplatesSettings";
import { HolidaysSettings } from "@/components/availability/HolidaysSettings";
import { TabButton } from "@/components/configuracoes/SettingsControls";
import {
  BILLING_TAB_ENABLED,
  resolveSettingsTab,
  type SettingsTab,
  type SettingsTabAccess,
} from "@/components/configuracoes/settings-tabs";
import { useProfileSettings } from "@/components/configuracoes/useProfileSettings";
import { useNotificationSettings } from "@/components/configuracoes/useNotificationSettings";
import { useCheckoutReturn } from "@/components/configuracoes/useCheckoutReturn";
import { ProfileTab } from "@/components/configuracoes/ProfileTab";
import { NotificationsTab } from "@/components/configuracoes/NotificationsTab";
import { SecurityTab } from "@/components/configuracoes/SecurityTab";
import { HeaderTab } from "@/components/configuracoes/HeaderTab";
import { MyScheduleTab } from "@/components/configuracoes/MyScheduleTab";

const BillingSection = dynamic(
  () =>
    import("@/components/billing/BillingSection").then((m) => m.BillingSection),
  { ssr: false },
);

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
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const podeAdministrar = can(Permission.ADMINISTRACAO);
  const hasUser = !!user?.id;
  const acessoAbas: SettingsTabAccess = {
    isAccountOwner,
    emiteDocumentos: canIssueClinicalDocuments,
    isDoctor,
    podeAdministrar,
    hasUser,
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => resolveSettingsTab(searchParams.get("tab"), acessoAbas) ?? "profile",
  );

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

  useCheckoutReturn({
    checkoutParam: searchParams.get("checkout"),
    subscription,
    refreshSubscription,
    showToast,
    openPlanTab: () => setActiveTab("plan"),
  });

  const profileSettings = useProfileSettings({
    user,
    isAccountOwner,
    updateUser,
    showToast,
  });
  const notificationSettings = useNotificationSettings({
    podeAdministrar,
    showToast,
  });
  const profileIsDoctor = !!profileSettings.profile.isDoctor;
  const mostraPlano = isAccountOwner && BILLING_TAB_ENABLED;

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
              {mostraPlano && (
                <TabButton
                  active={activeTab === "plan"}
                  onClick={() => setActiveTab("plan")}
                  icon={CreditCard}
                  label="Plano e Faturamento"
                />
              )}
              {profileIsDoctor && (
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
              {podeAdministrar && (
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
            {activeTab === "profile" && (
              <ProfileTab
                settings={profileSettings}
                isAccountOwner={isAccountOwner}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab settings={notificationSettings} />
            )}
            {activeTab === "plan" && mostraPlano && <BillingSection />}
            {activeTab === "security" && <SecurityTab showToast={showToast} />}
            {activeTab === "header" && profileIsDoctor && (
              <HeaderTab showToast={showToast} />
            )}
            {activeTab === "privacy" && <PrivacySection />}
            {activeTab === "my-schedule" && isDoctor && user?.id && (
              <MyScheduleTab doctorId={user.id} />
            )}
            {activeTab === "holidays" && podeAdministrar && (
              <HolidaysSettings />
            )}
            {activeTab === "document-templates" &&
              canIssueClinicalDocuments &&
              user?.id && <DocumentTemplatesSettings doctorId={user.id} />}
            {activeTab === "onboarding" && <OnboardingSettingsTab />}
          </div>
        </div>
      </div>
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
