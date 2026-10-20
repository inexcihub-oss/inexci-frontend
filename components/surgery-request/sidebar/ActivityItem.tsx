"use client";

import Image from "next/image";
import type { Activity } from "@/services/surgery-request.service";
import { ActivityContent } from "@/components/surgery-request/ActivityContent";
import { AvatarOrInitials } from "./AvatarOrInitials";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getApiFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
}

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function ActivityItem({ activity }: { activity: Activity }) {
  const isPdfGenerated = activity.type === "pdf_generated";
  const hasActor = Boolean(activity.user);

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-neutral-100 last:border-b-0">
      <div className="flex-shrink-0 mt-0.5">
        {hasActor && activity.user ? (
          <AvatarOrInitials user={activity.user} size={28} />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
            <Image
              src="/brand/icon.png"
              alt="Inexci"
              width={16}
              height={16}
              className="rounded-sm"
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-medium text-gray-800 truncate">
            {activity.user?.name ?? "Sistema"}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {formatActivityDate(activity.createdAt)}
          </span>
        </div>
        {isPdfGenerated && activity.pdfUrl ? (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-600 leading-snug">
              {activity.content}
            </p>
            <a
              href={getApiFileUrl(activity.pdfUrl) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium underline underline-offset-2 flex-shrink-0"
            >
              Ver PDF
            </a>
          </div>
        ) : (
          <ActivityContent
            content={activity.content}
            mentions={activity.mentions}
          />
        )}
      </div>
    </div>
  );
}
