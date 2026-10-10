import type React from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import type { ReportSection } from "@/services/surgery-request.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { LaudoSpinner } from "./LaudoSpinner";

interface LaudoSectionItemProps {
  section: ReportSection;
  isFirst: boolean;
  isLast: boolean;
  isReadOnly: boolean;
  isDeleting: boolean;
  isDragTarget: boolean;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandlers: Pick<
    React.HTMLAttributes<HTMLDivElement>,
    "onDragStart" | "onDragOver" | "onDragLeave" | "onDrop" | "onDragEnd"
  >;
}

export function LaudoSectionItem({
  section,
  isFirst,
  isLast,
  isReadOnly,
  isDeleting,
  isDragTarget,
  onMove,
  onEdit,
  onDelete,
  dragHandlers,
}: LaudoSectionItemProps) {
  return (
    <div
      className={`flex gap-2 transition-colors ${
        isDragTarget ? "bg-teal-50 rounded-lg" : ""
      }`}
      draggable
      {...dragHandlers}
    >
      {!isReadOnly && (
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={isFirst}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30"
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <div className="cursor-grab active:cursor-grabbing p-0.5">
            <GripVertical className="w-4 h-4 text-gray-300" />
          </div>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={isLast}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30"
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div
            className="font-semibold text-gray-900 break-words prose prose-sm max-w-none min-w-0"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(section.title),
            }}
          />
          {!isReadOnly && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                title="Editar seção"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M11 2l3 3-9 9H2v-3l9-9z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500 disabled:opacity-50"
                title="Remover seção"
              >
                {isDeleting ? (
                  <LaudoSpinner className="w-3.5 h-3.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
        {section.description ? (
          <div
            className="text-xs text-gray-600 leading-relaxed prose prose-sm max-w-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(section.description),
            }}
          />
        ) : (
          <span className="text-xs text-gray-400 italic">Sem descrição</span>
        )}
      </div>
    </div>
  );
}
