import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LegalDocumentView } from "./LegalDocumentView";

const SLUG_ALIAS: Record<string, string> = {
  politica: "privacy-policy",
  termos: "terms-of-use",
  ia: "ai-disclosure",
  "privacy-policy": "privacy-policy",
  "terms-of-use": "terms-of-use",
  "ai-disclosure": "ai-disclosure",
};

const TITLE_BY_SLUG: Record<string, string> = {
  "privacy-policy": "Política de Privacidade",
  "terms-of-use": "Termos de Uso",
  "ai-disclosure": "Aviso de uso de Inteligência Artificial",
};

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const canonical = SLUG_ALIAS[params.slug];
  if (!canonical) return { title: "Documento não encontrado · Inexci" };
  return {
    title: `${TITLE_BY_SLUG[canonical]} · Inexci`,
    description: TITLE_BY_SLUG[canonical],
  };
}

export default function LegalDocumentPage({ params }: PageProps) {
  const canonical = SLUG_ALIAS[params.slug];
  if (!canonical) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/icon.png"
              alt="Inexci"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-sm font-semibold text-gray-900">Inexci</span>
          </Link>
          <Link
            href="/login"
            className="text-xs text-primary-700 hover:underline"
          >
            Voltar para o app
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-10">
          <LegalDocumentView
            slug={canonical}
            title={TITLE_BY_SLUG[canonical]}
          />
        </div>
        <p className="text-xs text-gray-500 text-center mt-6">
          Em caso de dúvidas, entre em contato com o nosso Encarregado pelo
          Tratamento de Dados (DPO) através de privacidade@inexci.com.br.
        </p>
      </main>
    </div>
  );
}
