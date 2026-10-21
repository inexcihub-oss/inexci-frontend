"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { FinancialAccountsSection } from "@/components/finance/settings/FinancialAccountsSection";
import { PaymentMethodsSection } from "@/components/finance/settings/PaymentMethodsSection";
import { ServicePricesSection } from "@/components/finance/ServicePricesSection";

export function FinanceSettings() {
  return (
    <PageContainer>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex items-center gap-2 px-3 lg:px-6 py-3 border-b border-neutral-100 shrink-0">
          <Link
            href="/financeiro"
            aria-label="Voltar ao financeiro"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-neutral-700 hover:bg-neutral-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base lg:text-lg font-bold text-neutral-900">
              Configurações do financeiro
            </h1>
            <p className="text-xs text-neutral-500">
              Contas, formas de pagamento e tabela de preços
            </p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto flex flex-col gap-4 px-3 lg:px-6 py-4">
            <FinancialAccountsSection />
            <PaymentMethodsSection />
            <ServicePricesSection />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
