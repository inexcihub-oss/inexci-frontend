"use client";

import { useState } from "react";
import { AlertTriangle, Copy, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  RECOVERY_CODES_FILENAME,
  buildRecoveryCodesFile,
  downloadTextFile,
} from "@/lib/mfa";

export function RecoveryCodesPanel({
  codes,
  email,
}: {
  codes: string[];
  email?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    downloadTextFile(
      RECOVERY_CODES_FILENAME,
      buildRecoveryCodesFile(codes, email),
    );
  };

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Guarde estes códigos em um local seguro. Eles aparecem só agora e
          cada um pode ser usado uma única vez para entrar caso você perca o
          acesso ao aplicativo autenticador.
        </p>
      </div>

      <ul
        aria-label="Códigos de recuperação"
        className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 sm:grid-cols-2"
      >
        {codes.map((code) => (
          <li key={code} className="tracking-wider">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="min-h-[44px] rounded-xl"
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          {copied ? "Copiados!" : "Copiar códigos"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          className="min-h-[44px] rounded-xl"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Baixar .txt
        </Button>
      </div>
    </div>
  );
}
