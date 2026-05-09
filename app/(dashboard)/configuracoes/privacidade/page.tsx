"use client";

import { Shield } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { PrivacySection } from "@/components/privacy/PrivacySection";

export default function PrivacidadePage() {
  return (
    <PageContainer>
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="ds-page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Privacidade e Consentimentos
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Veja quais termos você aceitou e ative ou desative o assistente de
            IA quando quiser.
          </p>
        </div>

        <div className="max-w-4xl">
          <PrivacySection />
        </div>
      </div>
    </PageContainer>
  );
}
