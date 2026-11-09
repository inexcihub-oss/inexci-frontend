"use client";

import PageContainer from "@/components/PageContainer";
import { NotificationsHealthSection } from "./NotificationsHealthSection";
import { SystemJobsSection } from "./SystemJobsSection";

export function AdminSystem() {
  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">Sistema</h1>
          <p className="text-xs text-neutral-500">
            Saúde dos canais de notificação e rotinas automáticas da plataforma
          </p>
        </header>
        <div className="flex-1 space-y-6 overflow-auto px-3 py-4 lg:px-6">
          <NotificationsHealthSection />
          <SystemJobsSection />
        </div>
      </div>
    </PageContainer>
  );
}
