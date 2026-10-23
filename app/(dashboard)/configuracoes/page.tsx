"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { OnboardingSettingsTab } from "@/components/onboarding/OnboardingSettingsTab";
import { PrivacySection } from "@/components/privacy/PrivacySection";
import { DocumentTemplatesSettings } from "@/components/clinical/DocumentTemplatesSettings";
import { HolidaysSettings } from "@/components/availability/HolidaysSettings";
import { TabButton } from "@/components/configuracoes/SettingsControls";
import {
  BILLING_TAB_ENABLED,
  resolveSettingsTab,
  settingsNavGroups,
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
import { PatientNoticesTab } from "@/components/configuracoes/PatientNoticesTab";
import { ClinicalSnippetsSettings } from "@/components/clinical/ClinicalSnippetsSettings";

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
  const [detalheNoCelular, setDetalheNoCelular] = useState(
    () => !!searchParams.get("tab"),
  );
  const veioDaLista = useRef(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) {
      setDetalheNoCelular(false);
      return;
    }
    const resolvido = resolveSettingsTab(tab, {
      isAccountOwner,
      emiteDocumentos: canIssueClinicalDocuments,
      isDoctor,
      podeAdministrar,
      hasUser,
    });
    if (resolvido) {
      setActiveTab(resolvido);
      setDetalheNoCelular(true);
    }
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
    openPlanTab: () => {
      setActiveTab("plan");
      setDetalheNoCelular(true);
    },
  });

  const profileSettings = useProfileSettings({
    user,
    isAccountOwner,
    updateUser,
    showToast,
  });
  const notificationSettings = useNotificationSettings({ showToast });
  const profileIsDoctor = !!profileSettings.profile.isDoctor;
  const mostraPlano = isAccountOwner && BILLING_TAB_ENABLED;
  const gruposDaNavegacao = settingsNavGroups({
    ...acessoAbas,
    mostraCabecalho: profileIsDoctor,
  });
  const rotuloDaSecao =
    gruposDaNavegacao
      .flatMap((grupo) => grupo.items)
      .find((item) => item.id === activeTab)?.label ?? "Configurações";

  const abrirSecao = (tab: SettingsTab) => {
    setActiveTab(tab);
    setDetalheNoCelular(true);
    const noCelular = !window.matchMedia?.("(min-width: 1024px)")?.matches;
    veioDaLista.current = noCelular;
    const url = `/configuracoes?tab=${tab}`;
    if (noCelular) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };

  const voltarParaLista = () => {
    setDetalheNoCelular(false);
    if (veioDaLista.current) {
      veioDaLista.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/configuracoes");
    }
  };

  return (
    <PageContainer>
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className={cn("mb-6", detalheNoCelular && "hidden lg:block")}>
          <h1 className="ds-page-title">Configurações</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        {detalheNoCelular && (
          <div className="mb-4 lg:hidden">
            <button
              type="button"
              onClick={voltarParaLista}
              aria-label="Voltar para Configurações"
              className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-medium text-primary-700 active:bg-primary-50"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              Configurações
            </button>
            <h2 className="ds-page-title mt-1">{rotuloDaSecao}</h2>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div
            className={cn(
              "w-full lg:w-64 shrink-0",
              detalheNoCelular && "hidden lg:block",
            )}
          >
            <nav
              aria-label="Seções das configurações"
              className="flex flex-col gap-6 lg:gap-5"
            >
              {gruposDaNavegacao.map((grupo) => (
                <div
                  key={grupo.id}
                  role="group"
                  aria-labelledby={`grupo-config-${grupo.id}`}
                  className="flex flex-col gap-1.5 lg:gap-1"
                >
                  <p
                    id={`grupo-config-${grupo.id}`}
                    className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {grupo.label}
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 lg:flex lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:divide-y-0">
                    {grupo.items.map((item) => (
                      <TabButton
                        key={item.id}
                        active={activeTab === item.id}
                        onClick={() => abrirSecao(item.id)}
                        icon={item.icon}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <div
            className={cn(
              "flex-1 min-w-0",
              !detalheNoCelular && "hidden lg:block",
            )}
          >
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
            {activeTab === "clinical-snippets" && isDoctor && user?.id && (
              <ClinicalSnippetsSettings doctorId={user.id} />
            )}
            {activeTab === "holidays" && podeAdministrar && (
              <HolidaysSettings />
            )}
            {activeTab === "patient-notices" && podeAdministrar && (
              <PatientNoticesTab showToast={showToast} />
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
