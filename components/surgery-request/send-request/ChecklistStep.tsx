"use client";

import type { ChecklistItem } from "./types";

interface ChecklistStepProps {
  isLoading: boolean;
  checklist: ChecklistItem[];
  saveAsTemplate: boolean;
  onSaveAsTemplateChange: (value: boolean) => void;
  templateName: string;
  onTemplateNameChange: (value: string) => void;
}

export function ChecklistStep({
  isLoading,
  checklist,
  saveAsTemplate,
  onSaveAsTemplateChange,
  templateName,
  onTemplateNameChange,
}: ChecklistStepProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
        </div>
      ) : (
        <>
          {checklist.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 rounded-xl border border-gray-200"
            >
              <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900">
                {item.label}
              </span>
              <span
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs md:text-sm font-medium shrink-0 ${
                  item.isComplete
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-50 text-yellow-800"
                }`}
              >
                {item.isComplete ? "Completo" : "Incompleto"}
              </span>
            </div>
          ))}

          <div className="flex flex-col gap-3 px-4 py-4 rounded-xl border border-gray-200 bg-gray-50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => onSaveAsTemplateChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 accent-teal-600 cursor-pointer"
              />
              <span className="text-xs md:text-sm font-semibold text-gray-900">
                Salvar como modelo para reutilizar
              </span>
            </label>
            {saveAsTemplate && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Nome do modelo:</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => onTemplateNameChange(e.target.value)}
                  placeholder="Ex: Artroplastia padrão Unimed"
                  className="ds-input text-xs md:text-sm"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
