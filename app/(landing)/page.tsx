import { headers } from "next/headers";
import CallToAction from "@/components/landing/call-to-action";
import FAQs from "@/components/landing/faqs";
import PainSection from "@/components/landing/pain-section";
import Features from "@/components/landing/features";
import Footer from "@/components/landing/footer";
import HeroSection from "@/components/landing/hero-section";
import StatsSection from "@/components/landing/stats";
import Benefits from "@/components/landing/benefits";
import { SITE_URL } from "@/lib/landing/seo";

export default async function LandingPage() {
  // script estático no HTML inicial: strict-dynamic não cobre isso (só
  // scripts inseridos via JS por um script já confiável) — precisa de nonce
  // explícito, senão a CSP bloqueia o JSON-LD de SEO.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Inexci",
            url: SITE_URL,
            logo: `${SITE_URL}/images/logo.png`,
            sameAs: ["https://www.instagram.com/inexci.oficial"],
          }),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Inexci",
            url: SITE_URL,
            inLanguage: "pt-BR",
            logo: `${SITE_URL}/images/logo.png`,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/?s={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Inexci | Gestão de solicitações cirúrgicas",
            description:
              "A primeira plataforma brasileira que centraliza e automatiza toda a gestão de solicitações cirúrgicas.",
            url: SITE_URL,
            inLanguage: "pt-BR",
            logo: `${SITE_URL}/images/logo.png`,
          }),
        }}
      />

      <HeroSection />
      <PainSection />
      <StatsSection />
      <Features />
      <Benefits />
      <FAQs />
      <CallToAction />
      <Footer />
    </>
  );
}
