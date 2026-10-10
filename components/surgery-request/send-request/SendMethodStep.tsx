"use client";

import type { ReactNode } from "react";
import { Download, FileText, Mail, type LucideIcon } from "lucide-react";
import type { SendMethod } from "./types";

interface SendMethodStepProps {
  sendMethod: SendMethod;
  onSelect: (method: Exclude<SendMethod, null>) => void;
  hasSourceDocument: boolean;
  sourceDocumentName?: string;
}

const SYSTEM_TEMPLATE_BADGE = (
  <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-gray-100 text-gray-500">
    Documento gerado no modelo do sistema
  </span>
);

interface MethodOptionProps {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}

function MethodOption({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  children,
}: MethodOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-4 p-6 rounded-xl border text-left transition-colors ${
        selected
          ? "border-teal-500 bg-teal-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0 text-gray-700 mt-0.5" />
      <div className="flex flex-col gap-1">
        <span className="text-xs md:text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="text-xs md:text-sm text-gray-400">{description}</span>
        {children}
      </div>
    </button>
  );
}

export function SendMethodStep({
  sendMethod,
  onSelect,
  hasSourceDocument,
  sourceDocumentName,
}: SendMethodStepProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-xs md:text-sm text-gray-900">
        Como deseja enviar a solicitação?
      </p>

      <MethodOption
        selected={sendMethod === "download"}
        onClick={() => onSelect("download")}
        icon={Download}
        title="Download Manual"
        description="Baixe um arquivo PDF contendo: Laudo médico, documentos, OPME e códigos TUSS"
      >
        {hasSourceDocument && SYSTEM_TEMPLATE_BADGE}
        <span className="text-xs md:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
          Atenção: a opção Download Manual atualiza automaticamente o status da
          solicitação para &ldquo;Enviada&rdquo;, indicando ao sistema que ela
          já foi enviada ao convênio/plano de saúde.
        </span>
      </MethodOption>

      {hasSourceDocument ? (
        <>
          <MethodOption
            selected={sendMethod === "email"}
            onClick={() => onSelect("email")}
            icon={Mail}
            title="Enviar por e-mail"
            description="Envie o PDF gerado pela plataforma (laudo, documentos, OPME e códigos TUSS) diretamente ao convênio"
          >
            {SYSTEM_TEMPLATE_BADGE}
          </MethodOption>

          <MethodOption
            selected={sendMethod === "email_source"}
            onClick={() => onSelect("email_source")}
            icon={Mail}
            title="Enviar documento de origem por e-mail"
            description={
              <>
                Envia o arquivo original usado para criar esta solicitação (
                {sourceDocumentName ?? "documento de origem"}) diretamente ao
                convênio
              </>
            }
          />

          <MethodOption
            selected={sendMethod === "document"}
            onClick={() => onSelect("document")}
            icon={FileText}
            title="Confirmar com documento de origem"
            description="O documento já está na plataforma — apenas atualiza o status para Enviada, sem baixar ou enviar arquivos"
          />
        </>
      ) : (
        <MethodOption
          selected={sendMethod === "email"}
          onClick={() => onSelect("email")}
          icon={Mail}
          title="Enviar por e-mail"
          description="Envie a solicitação diretamente para o convênio por e-mail"
        />
      )}
    </div>
  );
}
