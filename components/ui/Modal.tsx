"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

const openModals: string[] = [];

function isTopModal(id: string): boolean {
  return openModals[openModals.length - 1] === id;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  disableClose?: boolean;
  variant?: "dialog" | "drawer";
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  disableClose = false,
  variant = "dialog",
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const stackId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = () => {
    if (!disableClose) onCloseRef.current();
  };

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(requestClose);

  useEffect(() => {
    if (!isOpen) return;
    openModals.push(stackId);
    document.body.style.overflow = "hidden";
    return () => {
      const index = openModals.lastIndexOf(stackId);
      if (index !== -1) openModals.splice(index, 1);
      if (openModals.length === 0) document.body.style.overflow = "";
    };
  }, [isOpen, stackId]);

  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableElements = Array.from(
      modal.querySelectorAll<HTMLElement>(focusableSelector),
    );

    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(stackId)) return;
      if (event.key === "Escape") {
        if (disableClose) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === first || !modal.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, disableClose, stackId]);

  if (!isOpen || typeof document === "undefined") return null;

  const sizeClasses = {
    sm: "md:max-w-md",
    md: "md:max-w-2xl",
    lg: "md:max-w-4xl",
    xl: "md:max-w-6xl",
  };

  const isDrawer = variant === "drawer";
  const isDragging = dragY > 0;
  const opacity = isDragging ? Math.max(0.2, 1 - dragY / 300) : 1;

  const content = (
    <div
      className={
        isDrawer
          ? "fixed inset-0 z-60 flex flex-col justify-end sm:flex-row sm:justify-end"
          : "fixed inset-0 z-60 flex items-end md:items-center justify-center"
      }
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        style={{ opacity }}
        onClick={requestClose}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          isDrawer
            ? `relative bg-white w-full flex flex-col overflow-hidden
          rounded-t-2xl sm:rounded-none
          max-h-[92dvh] sm:max-h-full sm:h-full sm:w-[420px] sm:max-w-full
          animate-slide-up sm:animate-slide-in-right
          shadow-2xl mobile-sheet-offset`
            : `relative bg-white w-full ${sizeClasses[size]} flex flex-col
          rounded-t-3xl md:rounded-2xl overflow-hidden
          max-h-[92vh] md:max-h-[85vh]
          animate-slide-up md:animate-scale-in
          md:mx-4
          shadow-xl mobile-sheet-offset`
        }
        style={
          isDragging
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 md:p-6 border-b border-neutral-100">
          <h2 id={titleId} className="ds-modal-title">
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
