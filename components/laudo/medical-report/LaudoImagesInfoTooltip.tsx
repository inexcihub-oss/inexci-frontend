"use client";

import { useEffect, useRef, useState } from "react";

export function LaudoImagesInfoTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [isOpen]);

  function open() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
    setIsOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Informações sobre as imagens do laudo"
        className="w-4 h-4 flex items-center justify-center text-teal-500 hover:text-teal-700 transition-colors focus:outline-none"
        onMouseEnter={open}
        onMouseLeave={(e) => {
          const related = e.relatedTarget as Node | null;
          if (
            tooltipRef.current &&
            related &&
            tooltipRef.current.contains(related)
          )
            return;
          setIsOpen(false);
        }}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 11v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7.5" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {isOpen && typeof window !== "undefined" && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[9999] w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed font-normal normal-case tracking-normal"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div
            className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm"
            aria-hidden="true"
          />
          As imagens anexadas aqui serão exibidas no{" "}
          <strong>meio do laudo</strong>, abaixo do histórico.
        </div>
      )}
    </>
  );
}
