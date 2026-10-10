"use client";

import type React from "react";
import { useRef } from "react";

interface LaudoSignatureCardProps {
  signatureUrl: string | null;
  isReadOnly: boolean;
  isUploading: boolean;
  isOtherDoctor: boolean;
  doctorName?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  onGoToSettings: () => void;
}

const ADD_BUTTON_CLASS =
  "flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors";

export function LaudoSignatureCard({
  signatureUrl,
  isReadOnly,
  isUploading,
  isOtherDoctor,
  doctorName,
  onUpload,
  onDelete,
  onGoToSettings,
}: LaudoSignatureCardProps) {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="ds-section-title leading-loose">ASSINATURA DO MÉDICO</h3>

      {signatureUrl ? (
        <div className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureUrl}
            alt="Assinatura do médico"
            className="h-8 max-w-[120px] object-contain flex-shrink-0"
          />
          <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate">
            Assinatura
          </span>
          {!isReadOnly && (
            <button
              type="button"
              disabled={isUploading}
              onClick={onDelete}
              className="flex-shrink-0 px-3 py-1.5 text-xs md:text-sm text-red-600 rounded-lg cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? "Removendo..." : "Remover"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full py-3 px-4 sm:pl-4 sm:pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-xl">
          <p className="text-xs md:text-sm text-gray-500 leading-snug flex-1">
            {isReadOnly
              ? "Nenhuma assinatura registrada no momento da criação do laudo."
              : isOtherDoctor
                ? `O médico ${doctorName} ainda não possui assinatura cadastrada. Adicione-a aqui para incluí-la no laudo.`
                : "Nenhuma assinatura configurada. Adicione sua assinatura nas configurações para incluí-la no laudo."}
          </p>
          {!isReadOnly &&
            (isOtherDoctor ? (
              <>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUpload}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => signatureInputRef.current?.click()}
                  className={`${ADD_BUTTON_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isUploading ? "Enviando..." : "Adicionar assinatura"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onGoToSettings}
                className={ADD_BUTTON_CLASS}
              >
                Adicionar assinatura
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
