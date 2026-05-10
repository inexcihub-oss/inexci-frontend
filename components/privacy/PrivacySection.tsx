"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { ToastType } from "@/types/toast.types";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/privacy/MarkdownContent";
import { useAuth } from "@/contexts/AuthContext";
import {
  consentService,
  type ConsentStatus,
  type ConsentType,
  type LegalDocument,
} from "@/services/consent.service";
import {
  CONSENT_SLUG_BY_TYPE,
  CONSENT_TYPE_LABELS,
} from "@/types/consent.types";

const SLUG_TO_PUBLIC_PATH: Record<string, string> = {
  "privacy-policy": "/privacidade/politica",
  "terms-of-use": "/privacidade/termos",
  "ai-disclosure": "/privacidade/ia",
};

interface ConsentRow {
  type: ConsentType;
  isAccepted: boolean;
  isRequired: boolean;
  acceptedAt: string | null;
}

function buildRows(status: ConsentStatus): ConsentRow[] {
  return [
    {
      type: "privacy_policy",
      isAccepted: Boolean(status.privacyPolicyAcceptedAt),
      isRequired: true,
      acceptedAt: status.privacyPolicyAcceptedAt,
    },
    {
      type: "terms_of_use",
      isAccepted: Boolean(status.termsOfUseAcceptedAt),
      isRequired: true,
      acceptedAt: status.termsOfUseAcceptedAt,
    },
    {
      type: "ai",
      isAccepted: Boolean(status.aiConsentAcceptedAt),
      isRequired: false,
      acceptedAt: status.aiConsentAcceptedAt,
    },
  ];
}

function ConsentBadge({ row }: { row: ConsentRow }) {
  if (row.isAccepted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Aceito
      </span>
    );
  }
  if (row.isRequired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 border border-rose-100">
        <ShieldAlert className="w-3.5 h-3.5" />
        Pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
      Desativado
    </span>
  );
}

/**
 * Bloco completo de gerenciamento de privacidade (status dos termos + IA).
 * Reutilizado tanto na rota dedicada quanto na aba "Privacidade" da página
 * principal de configurações.
 */
export function PrivacySection() {
  const { toast, showToast, hideToast } = useToast();
  const {
    consents,
    consentsLoading,
    refreshConsents: refreshAuthConsents,
  } = useAuth();

  const [aiToggleLoading, setAiToggleLoading] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [revokeAiOpen, setRevokeAiOpen] = useState(false);

  // Reaproveita o estado já carregado pelo AuthContext: evita uma segunda
  // chamada a /privacy/consent/status sempre que o usuário entra nesta tela.
  const status: ConsentStatus | null = consents;
  const loading = consentsLoading && !status;

  const rows = status ? buildRows(status) : [];
  const aiRow = rows.find((r) => r.type === "ai");

  const handleViewDoc = async (type: ConsentType) => {
    setDocLoading(true);
    try {
      const doc = await consentService.getDocument(type);
      setOpenDoc(doc);
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao buscar documento"), "error");
    } finally {
      setDocLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    setDocLoading(true);
    try {
      await consentService.acceptTerms();
      showToast("Termos aceitos com sucesso!", "success");
      setOpenDoc(null);
      await refreshAuthConsents();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao registrar aceite"), "error");
    } finally {
      setDocLoading(false);
    }
  };

  const handleToggleAi = async () => {
    if (!aiRow) return;
    if (aiRow.isAccepted) {
      setRevokeAiOpen(true);
      return;
    }
    setAiToggleLoading(true);
    try {
      await consentService.grantAi();
      showToast("Assistente de IA ativado.", "success");
      await refreshAuthConsents();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao ativar IA"), "error");
    } finally {
      setAiToggleLoading(false);
    }
  };

  const handleConfirmRevokeAi = async () => {
    setAiToggleLoading(true);
    try {
      await consentService.revokeAi();
      showToast("Assistente de IA desativado.", "success");
      setRevokeAiOpen(false);
      await refreshAuthConsents();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao desativar IA"), "error");
    } finally {
      setAiToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Status dos consentimentos
        </h2>
        {rows.map((row) => {
          const labels = CONSENT_TYPE_LABELS[row.type];
          const Icon = row.type === "ai" ? Bot : FileText;
          const slug = CONSENT_SLUG_BY_TYPE[row.type];
          const publicPath = SLUG_TO_PUBLIC_PATH[slug];
          return (
            <Card key={row.type} className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-6 pb-4 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl",
                      row.type === "ai" ? "bg-violet-50" : "bg-gray-100",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        row.type === "ai" ? "text-violet-600" : "text-gray-600",
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {labels.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {labels.subtitle}
                    </p>
                  </div>
                </div>
                <ConsentBadge row={row} />
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    {row.acceptedAt ? (
                      <>
                        Aceito em{" "}
                        {new Date(row.acceptedAt).toLocaleString("pt-BR")}
                      </>
                    ) : (
                      <>Nenhum aceite registrado</>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publicPath && (
                      <Link href={publicPath} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Abrir página
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDoc(row.type)}
                    >
                      Ler termo
                    </Button>
                    {row.type === "ai" && (
                      <Button
                        variant={row.isAccepted ? "outline" : "primary"}
                        size="sm"
                        isLoading={aiToggleLoading}
                        onClick={handleToggleAi}
                      >
                        {row.isAccepted
                          ? "Desativar assistente"
                          : "Ativar assistente"}
                      </Button>
                    )}
                    {row.type !== "ai" && !row.isAccepted && (
                      <Button size="sm" onClick={handleAcceptTerms}>
                        Aceitar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {openDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => !docLoading && setOpenDoc(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {CONSENT_TYPE_LABELS[openDoc.type].title}
              </h2>
              <button
                onClick={() => setOpenDoc(null)}
                disabled={docLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Fechar"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
            <div className="overflow-auto p-5 md:p-6 flex-1">
              <MarkdownContent source={openDoc.content_md} />
            </div>
            {(() => {
              const openDocRow = rows.find((r) => r.type === openDoc.type);
              const isAlreadyAccepted = openDocRow?.isAccepted ?? false;
              return (
                <div className="p-4 md:p-5 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenDoc(null)}
                    disabled={docLoading}
                  >
                    Fechar
                  </Button>
                  {openDoc.type !== "ai" && !isAlreadyAccepted && (
                    <Button onClick={handleAcceptTerms} isLoading={docLoading}>
                      Aceitar Política e Termos
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={revokeAiOpen}
        title="Desativar assistente de IA?"
        description="Mensagens enviadas ao bot do WhatsApp deixarão de ser respondidas. Você pode reativar a qualquer momento."
        onConfirm={handleConfirmRevokeAi}
        onCancel={() => setRevokeAiOpen(false)}
        loading={aiToggleLoading}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
