"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONSENT_TYPE_LABELS,
  type ConsentStatus,
} from "@/types/consent.types";

const STORAGE_PREFIX = "inexci.consent_notice_dismissed";

interface NoticeItem {
  status: ConsentStatus;
  storageKey: string;
}

/**
 * Toast/banner informativo exibido quando há **bump cosmético** (MINOR) da
 * versão de um consentimento já aceito. Diferente de mudanças MAJOR — que
 * obrigam novo aceite via `ConsentGate` — aqui apenas avisamos o usuário
 * para que possa revisar o documento.
 *
 * O aviso é dispensável e a dispensa fica armazenada em `localStorage` por
 * versão, evitando reaparecer.
 */
export function ConsentVersionNotice() {
  const { consents, loading } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = new Set<string>();
    for (const c of consents) {
      if (!c.acceptedVersion) continue;
      const key = `${STORAGE_PREFIX}.${c.type}.${c.currentVersion}`;
      if (localStorage.getItem(key) === "1") initial.add(key);
    }
    setDismissed(initial);
  }, [consents]);

  if (loading) return null;

  const items: NoticeItem[] = consents
    .filter((c) => c.acceptedVersion && c.acceptedVersion !== c.currentVersion)
    .map((c) => ({
      status: c,
      storageKey: `${STORAGE_PREFIX}.${c.type}.${c.currentVersion}`,
    }))
    .filter((it) => !dismissed.has(it.storageKey));

  if (items.length === 0) return null;

  const dismiss = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, "1");
    }
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed bottom-20 md:bottom-auto md:top-4 left-3 right-3 z-[70] flex flex-col gap-2 md:left-auto md:right-4 md:max-w-md">
      {items.map((item) => {
        const labels = CONSENT_TYPE_LABELS[item.status.type];
        return (
          <div
            key={item.storageKey}
            className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl shadow-lg flex items-start gap-3 animate-slide-up md:animate-slide-in-right"
          >
            <Bell className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold">
                Atualizamos a {labels.title}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Versão {item.status.currentVersion} disponível (você aceitou
                {" "}
                {item.status.acceptedVersion}).
                {" "}
                <Link
                  href="/configuracoes/privacidade"
                  className="underline font-medium"
                  onClick={() => dismiss(item.storageKey)}
                >
                  Ler atualização
                </Link>
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.storageKey)}
              className="flex-shrink-0 p-1 rounded hover:bg-amber-100"
              aria-label="Dispensar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
