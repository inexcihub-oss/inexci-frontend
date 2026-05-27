"use client";

import { type ReactNode } from "react";
import {
  BsChatLeftText,
  BsCashCoin,
  BsFolder2,
  BsHandIndex,
  BsWhatsapp,
  BsExclamationTriangle,
  BsBarChart,
  BsGraphUp,
  BsCardList,
} from "react-icons/bs";

export default function PainSection() {
  const painPoints: { title: string; description: string; icon: ReactNode }[] =
    [
      {
        title: "Reputação profissional em risco",
        description:
          "Comunicação deficiente compromete sua credibilidade médica.",
        icon: (
          <BsBarChart className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Perda de receita",
        description:
          "Pacientes desengajados pedem cancelamento da solicitação com mais facilidade.",
        icon: (
          <BsCashCoin className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Paciente frustrado",
        description: "Devido a falta de comunicação proativa e sem rotina.",
        icon: (
          <BsChatLeftText
            className="w-5 h-5"
            style={{ color: "var(--brand)" }}
          />
        ),
      },
      {
        title: "Aparenta perda de controle",
        description:
          "Seu paciente percebe que você não tem controle nem informações da solicitação.",
        icon: (
          <BsGraphUp className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Documentação desconectada da solicitação",
        description:
          "Múltiplas conversas e documentos importantes soltos e desconectados da solicitação.",
        icon: (
          <BsFolder2 className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Controle manual das solicitações cirúrgicas",
        description:
          "Depende de controle e ações humana na gestão de cada solicitação.",
        icon: (
          <BsHandIndex className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Comunicação via WhatsApp ineficiente",
        description:
          "Pacientes ficam sem resposta, informações importantes se perdem, paciente se sente desassistido.",
        icon: (
          <BsWhatsapp className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
      {
        title: "Falta de Controle das Solicitações Cirúrgicas",
        description:
          "Visão limitada da solicitação, sem automação de tarefas e registro de ações.",
        icon: (
          <BsExclamationTriangle
            className="w-5 h-5"
            style={{ color: "var(--brand)" }}
          />
        ),
      },
      {
        title: "Planilhas e Relatórios Desatualizados",
        description:
          "Tomada de decisões prejudicada por informações imprecisas e desatualizadas.",
        icon: (
          <BsCardList className="w-5 h-5" style={{ color: "var(--brand)" }} />
        ),
      },
    ];

  return (
    <section id="problemas" className="py-16 cv-auto mobile-text-bump">
      <div className="bg-linear-to-b absolute inset-0 -z-10 sm:inset-6 sm:rounded-b-3xl dark:block dark:to-[color-mix(in_oklab,var(--color-zinc-900)_75%,var(--color-background))]"></div>
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16 lg:space-y-20 dark:[--color-border:color-mix(in_oklab,var(--color-white)_10%,transparent)]">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reconhece esses problemas?
          </h2>
          <p className="mt-4 text-[17px] sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
            Veja os principais desafios enfrentados por cirurgiões e clínicas na
            gestão de solicitações cirúrgicas.
          </p>
        </div>

        <div className="flex justify-center lg:px-0">
          <div className="w-full max-w-3xl lg:max-w-5xl space-y-2">
            {painPoints.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border p-4 bg-background/60 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">{item.icon}</div>
                  <div className="space-y-1">
                    <h3 className="text-[17px] sm:text-base lg:text-lg font-semibold leading-6">
                      {item.title}
                    </h3>
                    <p className="text-[17px] lg:text-[18px] leading-6 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
