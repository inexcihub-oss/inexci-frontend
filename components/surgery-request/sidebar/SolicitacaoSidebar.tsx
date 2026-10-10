"use client";

import type { RefObject, TouchEvent } from "react";
import type {
  Activity,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import type { ValidationResult } from "@/services/pendency.service";
import { DynamicPendencyList } from "@/components/pendencies";
import { ActivityComposer } from "@/components/surgery-request/ActivityComposer";
import { ActivityItem } from "./ActivityItem";
import { StatusTimeline } from "./StatusTimeline";

export type SidebarTab = "pendencias" | "atividades" | "timeline";

interface SolicitacaoSidebarProps {
  solicitacao: SurgeryRequestDetail;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  dragY: number;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  activities: Activity[];
  loadingActivities: boolean;
  activitiesListRef: RefObject<HTMLDivElement>;
  onActivitySent: (activity: Activity) => void;
  validation: ValidationResult | null;
  loadingPendencies: boolean;
  onPendencyClick: (key: string) => void;
}

export function SolicitacaoSidebar({
  solicitacao,
  tab,
  onTabChange,
  onClose,
  dragY,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  activities,
  loadingActivities,
  activitiesListRef,
  onActivitySent,
  validation,
  loadingPendencies,
  onPendencyClick,
}: SolicitacaoSidebarProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] lg:hidden animate-fade-in"
        onClick={onClose}
      />
      <div
        data-testid="painel-lateral-sc"
        className="fixed inset-x-0 bottom-16 z-[60] h-[calc(92dvh-64px)] bg-white rounded-t-3xl flex flex-col lg:relative lg:inset-auto lg:bottom-auto lg:z-auto lg:rounded-none lg:h-auto lg:w-88 lg:border-l lg:border-neutral-100 animate-slide-up lg:animate-none"
        style={
          dragY > 0
            ? {
                transform: `translateY(${dragY}px)`,
                transition: "none",
              }
            : undefined
        }
      >
        <div
          className="flex justify-center pt-3 pb-1 lg:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 lg:hidden">
          <span className="text-sm font-semibold text-gray-900">
            Pendências
          </span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl active:scale-[0.95] transition-all"
            aria-label="Fechar painel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center border-b border-neutral-100 h-13">
          <button
            onClick={() => onTabChange("pendencias")}
            className={`flex-1 h-full text-sm font-semibold transition-colors relative ${
              tab === "pendencias"
                ? "text-teal-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Pendências
            {tab === "pendencias" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange("atividades")}
            className={`flex-1 h-full text-sm font-semibold transition-colors relative ${
              tab === "atividades"
                ? "text-teal-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Atividades
            {tab === "atividades" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange("timeline")}
            className={`flex-1 h-full text-sm font-semibold transition-colors relative ${
              tab === "timeline"
                ? "text-teal-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Timeline
            {tab === "timeline" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
            )}
          </button>
        </div>

        {tab === "timeline" ? (
          <div
            className="flex-1 overflow-auto pb-16 lg:pb-0"
            style={{
              paddingBottom:
                "calc(64px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <StatusTimeline
              currentStatus={solicitacao.status}
              createdAt={solicitacao.createdAt}
              activities={activities}
            />
          </div>
        ) : tab === "atividades" ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            <div
              ref={activitiesListRef}
              data-testid="lista-atividades"
              className="flex-1 overflow-y-auto min-h-0"
            >
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-700" />
                </div>
              ) : activities.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  Nenhuma atividade registrada.
                  <br />
                  Adicione um comentário abaixo.
                </div>
              ) : (
                <div className="flex flex-col">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>

            <ActivityComposer
              surgeryRequestId={String(solicitacao.id)}
              onSent={onActivitySent}
            />
          </div>
        ) : (
          <>
            <div
              data-tour="sc-requisitos"
              className="flex-1 flex flex-col bg-white overflow-hidden relative"
            >
              <div className="flex-1 overflow-auto p-3">
                {loadingPendencies ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
                  </div>
                ) : validation ? (
                  <DynamicPendencyList
                    pendencies={validation.pendencies}
                    statusLabel={validation.statusLabel}
                    canAdvance={validation.canAdvance}
                    completedCount={validation.completedCount}
                    pendingCount={validation.pendingCount}
                    totalCount={validation.totalCount}
                    currentStatus={validation.currentStatus}
                    compact
                    onPendencyClick={onPendencyClick}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma pendência encontrada
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
