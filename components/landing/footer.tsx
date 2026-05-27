import { Logo } from "./logo";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-background border-t-2 border-t-border/50 mobile-text-bump">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-10">
              <div className="flex items-center gap-2">
                <a href="#home" aria-label="Inexci">
                  <Logo className="-ml-3.5" />
                </a>
              </div>

              <nav className="flex items-center gap-8">
                <a
                  href="#problemas"
                  className="text-muted-foreground duration-150 hover:text-foreground text-base sm:text-sm leading-7 font-medium transition-colors"
                  style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
                >
                  Problemas
                </a>
                <a
                  href="#solucoes"
                  className="text-muted-foreground duration-150 hover:text-foreground text-base sm:text-sm leading-7 font-medium transition-colors"
                  style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
                >
                  Soluções
                </a>
                <a
                  href="#beneficios"
                  className="text-muted-foreground duration-150 hover:text-foreground text-base sm:text-sm leading-7 font-medium transition-colors"
                  style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
                >
                  Benefícios
                </a>
                <a
                  href="#duvidas"
                  className="text-muted-foreground duration-150 hover:text-foreground text-base sm:text-sm leading-7 font-medium transition-colors"
                  style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
                >
                  Dúvidas
                </a>
              </nav>
            </div>
            <p
              className="text-base sm:text-sm leading-7 font-medium text-black dark:text-white opacity-60"
              style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
            >
              Copyright © {new Date().getFullYear()} Inexci. Todos os direitos
              reservados.
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-3 md:ml-auto">
            <div
              className="text-base sm:text-sm leading-7 font-medium text-black dark:text-white"
              style={{ fontFamily: "DM Sans, ui-sans-serif, system-ui" }}
            >
              Contato: contato@inexci.com
            </div>
            <div className="flex items-center gap-4" aria-label="Redes sociais">
              <a
                href="https://www.instagram.com/inexci.oficial/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Inexci"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/552139554708"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Inexci"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
