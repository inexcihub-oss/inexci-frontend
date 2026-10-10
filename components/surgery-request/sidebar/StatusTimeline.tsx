"use client";

import type { Activity } from "@/services/surgery-request.service";
import {
  ALL_STATUS_CODES,
  STATUS_META,
  SurgeryRequestStatusCode,
  statusCodeFromLabel,
} from "@/lib/surgery-request-status";

const ALL_STATUSES: { num: SurgeryRequestStatusCode; label: string }[] =
  ALL_STATUS_CODES.map((num) => ({ num, label: STATUS_META[num].label }));

export function extractStatusTarget(content: string): string | null {
  const quoted = content.match(/para\s+"([^"]+)"/i);
  if (quoted) return quoted[1].trim();
  const bare = content.match(/para\s+([^"—.\n]+?)\s*(?:—|\.|$)/i);
  return bare ? bare[1].trim() : null;
}

export function buildStatusDates(
  createdAt: string,
  activities: Activity[],
): Map<number, string> {
  const statusDates = new Map<number, string>();
  statusDates.set(SurgeryRequestStatusCode.PENDING, createdAt);

  activities
    .filter((a) => a.type === "status_change")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .forEach((a) => {
      const label = extractStatusTarget(a.content);
      if (!label) return;
      const code = statusCodeFromLabel(label);
      if (code !== undefined && !statusDates.has(code)) {
        statusDates.set(code, a.createdAt);
      }
    });

  return statusDates;
}

export function StatusTimeline({
  currentStatus,
  createdAt,
  activities,
}: {
  currentStatus: number;
  createdAt: string;
  activities: Activity[];
}) {
  const statusDates = buildStatusDates(createdAt, activities);

  const now = new Date();
  const createdDate = new Date(createdAt);
  const totalDays = Math.max(
    1,
    Math.ceil((now.getTime() - createdDate.getTime()) / 86400000),
  );

  const isEncerrada = currentStatus === SurgeryRequestStatusCode.CLOSED;
  const isFinalizada = currentStatus === SurgeryRequestStatusCode.FINALIZED;

  const visibleStatuses = isEncerrada
    ? ALL_STATUSES.filter(
        (s) =>
          statusDates.has(s.num) || s.num === SurgeryRequestStatusCode.CLOSED,
      )
    : ALL_STATUSES.filter((s) => s.num !== SurgeryRequestStatusCode.CLOSED);

  function getDaysInStage(statusNum: number): number | null {
    const enteredAt = statusDates.get(statusNum);
    if (!enteredAt) return null;
    const nextStatus = ALL_STATUSES.find(
      (s) => s.num > statusNum && statusDates.has(s.num),
    );
    const exitDate = nextStatus
      ? new Date(statusDates.get(nextStatus.num)!)
      : statusNum === currentStatus
        ? now
        : null;
    if (!exitDate) return null;
    return Math.max(
      0,
      Math.floor(
        (exitDate.getTime() - new Date(enteredAt).getTime()) / 86400000,
      ),
    );
  }

  return (
    <div className="p-4">
      <div
        className={`mb-5 rounded-xl px-4 py-3 flex items-center gap-3 ${
          isEncerrada ? "bg-red-50" : "bg-teal-50"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isEncerrada ? "bg-red-100" : "bg-teal-100"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke={isEncerrada ? "#dc2626" : "#0d9488"}
              strokeWidth="1.5"
            />
            <path
              d="M12 7V12L15 15"
              stroke={isEncerrada ? "#dc2626" : "#0d9488"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p
            className={`text-xs font-semibold ${isEncerrada ? "text-red-700" : "text-teal-700"}`}
          >
            Tempo total
          </p>
          <p
            className={`text-sm font-bold ${isEncerrada ? "text-red-900" : "text-teal-900"}`}
          >
            {totalDays === 1 ? "1 dia" : `${totalDays} dias`}
          </p>
        </div>
      </div>

      <div className="relative">
        {visibleStatuses.map((s, idx) => {
          const isThisEncerrada = s.num === SurgeryRequestStatusCode.CLOSED;
          const isCompleted =
            !isThisEncerrada && statusDates.has(s.num) && s.num < currentStatus;
          const isCurrent =
            !isEncerrada && !isFinalizada && s.num === currentStatus;
          const isFinalizedLast =
            isFinalizada && s.num === SurgeryRequestStatusCode.FINALIZED;
          const isFuture =
            !isEncerrada && !statusDates.has(s.num) && s.num > currentStatus;
          const isLast = idx === visibleStatuses.length - 1;
          const daysInStage = getDaysInStage(s.num);
          const enteredAt = statusDates.get(s.num);

          return (
            <div key={s.num} className="flex items-start gap-3 relative">
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] w-0.5 h-[calc(100%-2px)] ${
                    isCompleted || isFinalizedLast
                      ? "bg-teal-500"
                      : "bg-gray-200"
                  }`}
                />
              )}

              <div className="flex-shrink-0 z-10 mt-0.5">
                {isThisEncerrada ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-red-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6L18 18"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : isCompleted || isFinalizedLast ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-teal-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13L9 17L19 7"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-white border-[3px] border-teal-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-white border-2 border-gray-200" />
                )}
              </div>

              <div
                className={`pb-6 flex-1 min-w-0 ${isFuture ? "opacity-40" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isThisEncerrada
                        ? "text-red-600"
                        : isCurrent
                          ? "text-teal-700"
                          : isCompleted || isFinalizedLast
                            ? "text-gray-900"
                            : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      Atual
                    </span>
                  )}
                  {isFinalizedLast && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Concluída
                    </span>
                  )}
                  {isThisEncerrada && (
                    <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Encerrada
                    </span>
                  )}
                </div>
                {enteredAt && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(enteredAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {daysInStage !== null && (
                      <span className="ml-1.5 text-gray-500">
                        ·{" "}
                        {daysInStage === 0
                          ? "< 1 dia"
                          : daysInStage === 1
                            ? "1 dia"
                            : `${daysInStage} dias`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
