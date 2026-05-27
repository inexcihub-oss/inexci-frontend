import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import "@/styles/landing.css";
import { ThemeProvider } from "@/components/landing/theme-provider";
import { SITE_URL } from "@/lib/landing/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const isProd =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Inexci | Plataforma de Gestão de Solicitações Cirúrgicas",
    template: "%s | Inexci",
  },
  description:
    "Automatize e centralize solicitações cirúrgicas com a Inexci. Reduza cancelamentos, ganhe agilidade administrativa e foque nas suas cirurgias.",
  keywords: [
    "gestão de solicitações cirúrgicas",
    "automação hospitalar",
    "autorização de cirurgias",
    "plataforma para clínicas e hospitais",
    "reduzir cancelamentos cirúrgicos",
    "Inexci",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Inexci",
    title: "Inexci",
    description:
      "A primeira plataforma brasileira que centraliza e automatiza toda a gestão de solicitações cirúrgicas.",
    locale: "pt_BR",
    images: [
      {
        url: "/images/app.png",
        width: 1200,
        height: 630,
        alt: "Inexci",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inexci",
    description:
      "A primeira plataforma brasileira que centraliza e automatiza toda a gestão de solicitações cirúrgicas.",
    images: ["/images/app.png"],
  },
  robots: isProd
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
      }
    : {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
  icons: {
    icon: "/images/icon.png",
    shortcut: "/images/icon.png",
    apple: "/images/icon.png",
    other: [
      {
        rel: "logo",
        url: "/images/logo.png",
        type: "image/png",
      },
    ],
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {isProd && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1356643639391905');
              fbq('track', 'PageView');`}
          </Script>
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1356643639391905&ev=PageView&noscript=1" />`,
            }}
          />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-WFVTEKGRHC"
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-WFVTEKGRHC', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div
          className={`landing-root ${inter.variable} ${manrope.variable} antialiased min-h-screen`}
        >
          {children}
        </div>
      </ThemeProvider>
    </>
  );
}
