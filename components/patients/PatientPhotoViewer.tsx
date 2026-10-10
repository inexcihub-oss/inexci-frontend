"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function PatientPhotoViewer({
  src,
  nome,
  onClose,
  acoes,
}: {
  src: string;
  nome: string;
  onClose: () => void;
  acoes?: ReactNode;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${nome}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        ref={fecharRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fechar foto"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-5 w-5" />
      </button>

      <figure
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Foto de ${nome}`}
          className="max-h-[75vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        />
        <figcaption className="text-sm font-medium text-white/90 text-center">
          {nome}
        </figcaption>
        {acoes && (
          <div className="flex flex-wrap justify-center gap-2">{acoes}</div>
        )}
      </figure>
    </div>,
    document.body,
  );
}
