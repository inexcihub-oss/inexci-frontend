"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
  UserCog,
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

interface RightsCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

function RightsCard({
  title,
  description,
  icon: Icon,
  ctaLabel,
  href,
  onClick,
  disabled,
  badge,
}: RightsCardProps) {
  const inner = (
    <div
      className={cn(
        "h-full p-4 md:p-5 rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-sm",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary-50">
          <Icon className="w-5 h-5 text-primary-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            {badge && (
              <span className="text-[10px] uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
          <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary-700">
            {ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
  if (disabled || (!href && !onClick)) return inner;
  if (href)
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full text-left w-full"
    >
      {inner}
    </button>
  );
}

/**
 * Bloco completo de gerenciamento de privacidade (status dos termos + IA).
 * Reutilizado tanto na rota dedicada quanto na aba "Privacidade" da página
 * principal de configurações.
 */
export function PrivacySection() {
  const { toast, showToast, hideToast } = useToast();
  const { refreshConsents: refreshAuthConsents } = useAuth();

  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiToggleLoading, setAiToggleLoading] = useState(false);

  const [openDoc, setOpenDoc] = useState<LegalDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [revokeAiOpen, setRevokeAiOpen] = useState(false);

  const refresh = async () => {
    try {
      const next = await consentService.getStatus();
      setStatus(next);
      await refreshAuthConsents();
    } catch (err) {
      showToast(
        getApiErrorMessage(err, "Erro ao carregar consentimentos"),
        "error",
      );
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await refresh();
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
      await refresh();
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
      await refresh();
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
            <Card
              key={row.type}
              className="border border-gray-200 rounded-2xl"
            >
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
                        row.type === "ai"
                          ? "text-violet-600"
                          : "text-gray-600",
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDoc(row.type)}
                    >
                      Ler termo
                    </Button>
                    {publicPath && (
                      <Link href={publicPath} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Abrir página
                        </Button>
                      </Link>
                    )}
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Direitos do titular (LGPD art. 18)
        </h2>
        <p className="text-xs text-gray-500">
          A LGPD garante a você acesso, correção e eliminação dos seus dados,
          entre outros direitos. Solicitações são respondidas em até 15 dias
          úteis pelo nosso Encarregado (DPO).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <RightsCard
            title="Exportar meus dados"
            description="Baixe um arquivo com todos os dados pessoais que mantemos sobre você."
            icon={Download}
            ctaLabel="Solicitar exportação"
            badge="Em breve"
            disabled
          />
          <RightsCard
            title="Corrigir dados"
            description="Solicite ajuste de dados pessoais incorretos ou desatualizados."
            icon={Edit3}
            ctaLabel="Abrir solicitação"
            badge="Em breve"
            disabled
          />
          <RightsCard
            title="Eliminar minha conta"
            description="Peça a eliminação dos seus dados após o término do uso."
            icon={Trash2}
            ctaLabel="Iniciar processo"
            badge="Em breve"
            disabled
          />
          <RightsCard
            title="Falar com o DPO"
            description="Encarregado pelo Tratamento de Dados — privacidade@inexci.com.br."
            icon={UserCog}
            ctaLabel="Enviar e-mail"
            href="mailto:privacidade@inexci.com.br"
          />
        </div>
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
            {openDoc.type !== "ai" && (
              <div className="p-4 md:p-5 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDoc(null)}
                  disabled={docLoading}
                >
                  Fechar
                </Button>
                <Button onClick={handleAcceptTerms} isLoading={docLoading}>
                  Aceitar Política e Termos
                </Button>
              </div>
            )}
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
