"use client";

import { CheckCircle } from "lucide-react";
import type { SendMethod } from "./types";

const SUCCESS_MESSAGES: Record<Exclude<SendMethod, null>, string> = {
  download: "Download iniciado automaticamente",
  document: "Solicitação confirmada com documento de origem",
  email_source: "Documento de origem enviado por e-mail",
  email: "E-mail enviado com sucesso",
};

interface SendSuccessStepProps {
  sendMethod: SendMethod;
}

export function SendSuccessStep({ sendMethod }: SendSuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-full">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg font-semibold text-gray-900 text-center">
          Solicitação enviada com sucesso!
        </span>
        <span className="text-xs md:text-sm text-gray-400 text-center">
          {SUCCESS_MESSAGES[sendMethod ?? "email"]}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 w-full px-4 py-4 rounded-xl bg-blue-50">
        <span className="text-xs md:text-sm font-semibold text-purple-600">
          Status atualizado:
        </span>
        <span className="text-xs md:text-sm text-purple-500">
          {" "}
          A solicitação agora está com status &ldquo;
        </span>
        <span className="text-xs md:text-sm font-semibold text-purple-600">
          Enviado
        </span>
        <span className="text-xs md:text-sm text-purple-500">&rdquo;</span>
      </div>
    </div>
  );
}
