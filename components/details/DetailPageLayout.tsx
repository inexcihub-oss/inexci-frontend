"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

interface DetailPageLayoutProps {
  /** Título da seção (ex: "Colaboradores", "Pacientes") */
  sectionTitle: string;
  /** Link para voltar à listagem */
  backHref: string;
  /** Nome do item sendo visualizado */
  itemName: string;
  /** Subtítulo opcional (ex: especialidade, tipo) */
  itemSubtitle?: string;
  /** Imagem do perfil ou iniciais */
  profileImage?: string;
  /** Navegação entre itens */
  navigation?: {
    currentIndex: number;
    totalItems: number;
    onPrevious?: () => void;
    onNext?: () => void;
  };
  /** Conteúdo principal (formulários) */
  children: ReactNode;
  /** Conteúdo da sidebar direita */
  sidebarContent?: ReactNode;
}

export function DetailPageLayout({
  sectionTitle,
  backHref,
  itemName,
  itemSubtitle,
  profileImage,
  navigation,
  children,
  sidebarContent,
}: DetailPageLayoutProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conteúdo Principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header com navegação */}
        <div className="flex items-center justify-between px-6 py-0 border-b border-neutral-100 h-13">
          <div className="flex items-center gap-2">
            {/* Botão voltar */}
            <Link
              href={backHref}
              className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            {/* Breadcrumb */}
            <div className="flex items-center">
              <div className="flex items-center justify-center px-2 py-4">
                <span className="text-sm text-gray-900">{sectionTitle}</span>
              </div>
              <svg
                className="w-6 h-6 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M10 8L14 12L10 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex items-center gap-1 px-2 py-4">
                <span className="text-sm font-semibold text-gray-900">
                  {itemName}
                </span>
              </div>
            </div>
          </div>

          {/* Navegação entre itens e menu */}
          <div className="flex items-center gap-2">
            {navigation && (
              <>
                <div className="flex items-center gap-1">
                  <div className="flex items-center justify-center h-10 px-3 text-xs text-gray-500">
                    <span className="font-medium">
                      {navigation.currentIndex}
                    </span>
                    <span className="mx-1 opacity-50">/</span>
                    <span className="opacity-50">{navigation.totalItems}</span>
                  </div>
                  <button
                    onClick={navigation.onPrevious}
                    disabled={navigation.currentIndex <= 1}
                    className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 15L12 9L6 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={navigation.onNext}
                    disabled={navigation.currentIndex >= navigation.totalItems}
                    className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* Linha separadora */}
            <div className="w-px h-6 bg-gray-200"></div>

            {/* Menu de três pontos horizontal */}
            <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 transition-colors p-1">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* Área de conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card de perfil */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-white to-transparent border border-[#DCDFE3] rounded-lg shadow-sm">
            {/* Avatar */}
            {profileImage ? (
              <Image
                src={profileImage}
                alt={itemName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-primary-100 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary-600">
                  {getInitials(itemName)}
                </span>
              </div>
            )}

            {/* Nome e subtítulo */}
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                {itemName}
              </h1>
              {itemSubtitle && (
                <p className="text-sm text-gray-500 opacity-70">
                  {itemSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Conteúdo dos formulários */}
          {children}
        </div>
      </div>

      {/* Sidebar Direita (opcional) */}
      {sidebarContent && (
        <div className="w-80 border-l border-neutral-100 overflow-y-auto">
          {sidebarContent}
        </div>
      )}
    </div>
  );
}
