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
  History,
  Loader2,
  Shield,
  ShieldAlert,
  Trash2,
  UserCog,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
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
  type ConsentLogEntry,
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

function ConsentBadge({ status }: { status: ConsentStatus }) {
  if (status.isAccepted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Aceito (v. {status.acceptedVersion})
      </span>
    );
  }
  if (status.isRequired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 border border-rose-100">
        <ShieldAlert className="w-3.5 h-3.5" />
        Pendente (v. {status.currentVersion})
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

export default function PrivacidadePage() {
  const { toast, showToast, hideToast } = useToast();
  const { refreshConsents: refreshAuthConsents } = useAuth();

  const [statuses, setStatuses] = useState<ConsentStatus[]>([]);
  const [history, setHistory] = useState<ConsentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiToggleLoading, setAiToggleLoading] = useState(false);

  const [openDoc, setOpenDoc] = useState<LegalDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [revokeAiOpen, setRevokeAiOpen] = useState(false);

  const refresh = async () => {
    try {
      const [statusList, historyList] = await Promise.all([
        consentService.getStatus(),
        consentService.getHistory(undefined, 20),
      ]);
      setStatuses(statusList);
      setHistory(historyList);
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

  const aiStatus = statuses.find((s) => s.type === "ai");

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

  const handleAcceptDoc = async () => {
    if (!openDoc) return;
    setDocLoading(true);
    try {
      await consentService.grant(openDoc.type, openDoc.version);
      showToast("Aceite registrado com sucesso!", "success");
      setOpenDoc(null);
      await refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao registrar aceite"), "error");
    } finally {
      setDocLoading(false);
    }
  };

  const handleToggleAi = async () => {
    if (!aiStatus) return;
    if (aiStatus.isAccepted) {
      setRevokeAiOpen(true);
      return;
    }
    setAiToggleLoading(true);
    try {
      await consentService.grant("ai", aiStatus.currentVersion);
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
      await consentService.revoke("ai");
      showToast("Assistente de IA desativado.", "success");
      setRevokeAiOpen(false);
      await refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erro ao desativar IA"), "error");
    } finally {
      setAiToggleLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="ds-page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Privacidade e Consentimentos
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Controle quais termos você aceitou, exerça seus direitos e veja o
            histórico das ações.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Status dos consentimentos
              </h2>
              {statuses.map((s) => {
                const labels = CONSENT_TYPE_LABELS[s.type];
                const Icon = s.type === "ai" ? Bot : FileText;
                const slug = CONSENT_SLUG_BY_TYPE[s.type];
                const publicPath = SLUG_TO_PUBLIC_PATH[slug];
                return (
                  <Card
                    key={s.type}
                    className="border border-gray-200 rounded-2xl"
                  >
                    <CardHeader className="p-6 pb-4 flex flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl",
                            s.type === "ai" ? "bg-violet-50" : "bg-gray-100",
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5",
                              s.type === "ai"
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
                      <ConsentBadge status={s} />
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-xs text-gray-500">
                          {s.acceptedAt ? (
                            <>
                              Última atualização em{" "}
                              {new Date(s.acceptedAt).toLocaleString("pt-BR")}
                            </>
                          ) : (
                            <>Nenhum aceite registrado</>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDoc(s.type)}
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
                          {s.type === "ai" && (
                            <Button
                              variant={s.isAccepted ? "outline" : "primary"}
                              size="sm"
                              isLoading={aiToggleLoading}
                              onClick={handleToggleAi}
                            >
                              {s.isAccepted
                                ? "Desativar assistente"
                                : "Ativar assistente"}
                            </Button>
                          )}
                          {s.type !== "ai" && !s.isAccepted && (
                            <Button
                              size="sm"
                              onClick={() => handleViewDoc(s.type)}
                            >
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
                A LGPD garante a você acesso, correção e eliminação dos seus
                dados, entre outros direitos. Solicitações são respondidas em
                até 15 dias úteis pelo nosso Encarregado (DPO).
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
                  title="Histórico de consentimentos"
                  description="Veja todas as suas ações de aceite e revogação."
                  icon={History}
                  ctaLabel="Ver abaixo"
                  href="#historico"
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

            <Card
              id="historico"
              className="border border-gray-200 rounded-2xl scroll-mt-24"
            >
              <CardHeader className="p-6 pb-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gray-100">
                  <History className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Histórico de aceites
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Cada ação é registrada com data, IP e dispositivo.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum registro ainda.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {CONSENT_TYPE_LABELS[h.consent_type]?.title ??
                              h.consent_type}
                            <span className="text-gray-400 font-normal">
                              {" "}
                              · v. {h.version}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(h.created_at).toLocaleString("pt-BR")}
                            {h.ip_address ? ` · ${h.ip_address}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            h.action === "granted"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {h.action === "granted" ? "Aceito" : "Revogado"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {CONSENT_TYPE_LABELS[openDoc.type].title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Versão atual: {openDoc.version}
                </p>
              </div>
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
            <div className="p-4 md:p-5 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenDoc(null)}
                disabled={docLoading}
              >
                Fechar
              </Button>
              <Button onClick={handleAcceptDoc} isLoading={docLoading}>
                Aceitar versão {openDoc.version}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={revokeAiOpen}
        title="Desativar assistente de IA?"
        description="Mensagens enviadas ao bot do WhatsApp deixarão de ser respondidas e o histórico das conversas anteriores será anonimizado para preservar a sua privacidade. Você pode reativar a qualquer momento."
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
    </PageContainer>
  );
}
