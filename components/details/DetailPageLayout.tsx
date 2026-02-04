"use client";

import { ReactNode, useState } from "react";
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
  /** Ícone da sidebar quando fechada */
  sidebarIcon?: "users" | "history" | "info";
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
  sidebarIcon = "users",
}: DetailPageLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const SidebarIconComponent = () => {
    switch (sidebarIcon) {
      case "history":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#111111" strokeWidth="1.5" />
            <path
              d="M12 7V12L15 15"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "info":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#111111" strokeWidth="1.5" />
            <path
              d="M12 16V12M12 8H12.01"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="7" r="4" stroke="#111111" strokeWidth="1.5" />
            <path
              d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
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
              className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-teal-50 transition-colors p-1"
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
                    className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-teal-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
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
                    className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-teal-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
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

            {/* Toggle Sidebar - apenas se houver sidebarContent */}
            {sidebarContent && (
              <>
                {/* Linha separadora */}
                <div className="w-px h-6 bg-gray-200"></div>

                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`w-6 h-6 flex items-center justify-center hover:bg-teal-50 transition-colors ${isSidebarOpen ? "border border-[#DCDFE3] rounded shadow-sm" : ""}`}
                  title={isSidebarOpen ? "Fechar painel" : "Abrir painel"}
                >
                  {isSidebarOpen ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 18L15 12L9 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <SidebarIconComponent />
                  )}
                </button>
              </>
            )}
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
      {sidebarContent && isSidebarOpen && (
        <div className="w-80 border-l border-neutral-100 flex flex-col">
          {/* Conteúdo da sidebar quando aberta */}
          <div className="flex-1 overflow-hidden">{sidebarContent}</div>
        </div>
      )}
    </div>
  );
}
