"use client";

import { DateInput } from "@/components/ui/DateInput";

interface SentAtStepProps {
  sentAt: string;
  onSentAtChange: (value: string) => void;
  error: string | null;
}

export function SentAtStep({ sentAt, onSentAtChange, error }: SentAtStepProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs md:text-sm text-gray-700">
          O documento já está na plataforma. Informe a data em que a solicitação
          foi de fato enviada ao convênio — útil quando o envio aconteceu antes
          da atualização do status aqui.
        </p>
      </div>
      <DateInput
        id="send-document-sent-at"
        label="Data do envio"
        value={sentAt}
        onChange={onSentAtChange}
        required
        error={error ?? undefined}
      />
    </div>
  );
}
