"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/landing/ui/accordion";
import { Hourglass, FileCheck, TrendingUp, Lock, BookOpen } from "lucide-react";
import React from "react";

const faqIcons: Record<string, React.ReactNode> = {
  hourglass: <Hourglass className="m-auto size-4" style={{ color: "var(--brand)" }} />,
  "file-check": <FileCheck className="m-auto size-4" style={{ color: "var(--brand)" }} />,
  "trending-up": <TrendingUp className="m-auto size-4" style={{ color: "var(--brand)" }} />,
  lock: <Lock className="m-auto size-4" style={{ color: "var(--brand)" }} />,
  "book-open": <BookOpen className="m-auto size-4" style={{ color: "var(--brand)" }} />,
};

type FAQItem = {
  id: string;
  icon: string;
  question: string;
  answer: string;
};

export default function FAQs() {
  const faqItems: FAQItem[] = [
    {
      id: "item-1",
      icon: "hourglass",
      question: "O que é o Inexci e para quem ele é indicado?",
      answer:
        "Inexci é o 1º software do Brasil focado na gestão integral de solicitações cirúrgicas, criado para cirurgiões(ãs) e/ou gestores administrativos que buscam otimizar processos, centralizar informações e garantir mais tranquilidade na rotina.",
    },
    {
      id: "item-2",
      icon: "file-check",
      question:
        "O Inexci auxilia na conformidade com a Lei dos Planos de Saúde (Lei 9.656/98 e RN 623/2024)?",
      answer:
        "Absolutamente. O Inexci é desenvolvido considerando as melhores práticas e as regulamentações da ANS, incluindo os prazos de resposta das operadoras e a necessidade de justificativas médicas embasadas. Ele te ajuda a gerenciar o registro de protocolos e a documentação necessária para contestar negativas indevidas.",
    },
    {
      id: "item-3",
      icon: "trending-up",
      question:
        "Como o Inexci ajuda a reduzir cancelamentos de cirurgias e aumentar o faturamento?",
      answer:
        "Ao otimizar a comunicação com os pacientes, garantir transparência e agilidade nas autorizações, o Inexci minimiza a ansiedade, melhora a experiência da paciente e reduz a probabilidade de cancelamentos por falha de comunicação ou burocracia, impactando diretamente no aumento do faturamento.",
    },
    {
      id: "item-4",
      icon: "lock",
      question:
        "Meus dados e os dados dos meus pacientes estarão seguros com o Inexci (LGPD)?",
      answer:
        "Sim, a segurança e a privacidade dos dados são prioridades máximas. O Inexci opera em conformidade total com a Lei Geral de Proteção de Dados (LGPD), utilizando tecnologias de criptografia e protocolos de segurança avançados para proteger todas as informações sensíveis.",
    },
  ];

  return (
    <section
      id="duvidas"
      className="bg-background py-16 cv-auto mobile-text-bump"
    >
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <div className="md:w-1/3">
            <div className="top-20">
              <h2
                className={
                  "text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white"
                }
              >
                Perguntas frequentes
              </h2>
              <p className="mt-4 text-[17px] sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
                Não conseguiu encontrar o que procurava? Entre em contato com
                contato@inexci.com.
              </p>
            </div>
          </div>
          <div className="md:w-2/3">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="bg-background shadow-xs rounded-lg border px-4 last:border-b"
                >
                  <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="flex size-6">
                        {faqIcons[item.icon]}
                      </div>
                      <span className="text-[17px] sm:text-base">
                        {item.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    <div className="px-9">
                      <p className="text-[17px] sm:text-base text-gray-600 dark:text-gray-300">
                        {item.answer}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem
                key="item-5"
                value="item-5"
                className="bg-background shadow-xs rounded-lg border px-4 last:border-b"
              >
                <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex size-6">
                      {faqIcons["book-open"]}
                    </div>
                    <span className="text-[17px] sm:text-base">
                      Quais são as fontes e referências das informações
                      apresentadas?
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="px-9">
                    <p className="text-[17px] sm:text-base text-gray-600 dark:text-gray-300">
                      As informações e estatísticas são extraídas de pesquisas e
                      relatórios reconhecidos, entre eles:{" "}
                      <a
                        href="https://sbot.org.br/amb-e-fmusp-divulgam-pesquisa-demografia-medica-no-brasil-2023/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand)] underline underline-offset-4 font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm transition"
                      >
                        Sociedade Brasileira de Ortopedia e Traumatologia (SBOT)
                        — Pesquisa 2023
                      </a>
                      ;{" "}
                      <a
                        href="https://transparencia.cfm.org.br/relatorio-de-gestao-anual/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand)] underline underline-offset-4 font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm transition"
                      >
                        Conselho Federal de Medicina (CFM) — Relatório 2022
                      </a>
                      ;{" "}
                      <a
                        href="https://datafolha.folha.uol.com.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand)] underline underline-offset-4 font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm transition"
                      >
                        Instituto Datafolha — Pesquisa Saúde Privada 2022
                      </a>
                      . Priorizamos fontes oficiais e atualizadas.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
