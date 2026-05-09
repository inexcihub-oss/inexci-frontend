"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MarkdownContent } from "@/components/privacy/MarkdownContent";
import {
  consentService,
  type LegalDocument,
} from "@/services/consent.service";
import { getApiErrorMessage } from "@/lib/http-error";

interface LegalDocumentViewProps {
  slug: string;
  title: string;
}

export function LegalDocumentView({ slug, title }: LegalDocumentViewProps) {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    consentService
      .getDocumentBySlug(slug)
      .then((data) => {
        if (!cancelled) setDoc(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, "Não foi possível carregar este documento."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500">Carregando documento...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Documento indisponível
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          {error ??
            "Não foi possível carregar este documento agora. Tente novamente em alguns minutos."}
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6 pb-4 border-b border-gray-100">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-700">
          Documento legal
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
          {title}
        </h1>
      </header>
      <MarkdownContent source={doc.content_md} />
    </>
  );
}
