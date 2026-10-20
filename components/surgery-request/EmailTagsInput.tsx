"use client";

import { X } from "lucide-react";
import type { EmailTagsState } from "@/hooks/useEmailTags";

interface EmailTagsInputProps {
  id: string;
  state: EmailTagsState;
  invalid?: boolean;
  disabled?: boolean;
  variant?: "default" | "neutral";
  borderClassName?: string;
  "aria-label"?: string;
}

export function EmailTagsInput({
  id,
  state,
  invalid = false,
  disabled = false,
  variant = "default",
  borderClassName = "border-gray-200",
  "aria-label": ariaLabel,
}: EmailTagsInputProps) {
  const neutral = variant === "neutral";
  const border = invalid
    ? "border-red-400"
    : neutral
      ? "border-neutral-100 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent"
      : borderClassName;

  return (
    <div
      className={
        neutral
          ? `flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border bg-white min-h-[40px] cursor-text transition-colors ${border}`
          : `flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border bg-white min-h-10 cursor-text ${border}`
      }
      onClick={() => document.getElementById(id)?.focus()}
    >
      {state.tags.map((tag) => (
        <span
          key={tag}
          className={
            neutral
              ? "flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-800"
              : "flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs md:text-sm text-gray-900"
          }
        >
          {tag}
          <button
            type="button"
            onClick={() => state.remove(tag)}
            disabled={disabled}
            aria-label={`Remover ${tag}`}
            className={
              neutral
                ? "text-neutral-400 hover:text-neutral-700 disabled:cursor-not-allowed"
                : "text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
            }
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={state.input}
        onChange={(e) => state.setInput(e.target.value)}
        onKeyDown={state.onKeyDown}
        onBlur={state.onBlur}
        placeholder={state.tags.length === 0 ? "exemplo@mail.com" : undefined}
        disabled={disabled}
        className={
          neutral
            ? "flex-1 min-w-24 text-sm text-gray-900 outline-none bg-transparent placeholder-neutral-400 disabled:cursor-not-allowed"
            : "flex-1 min-w-24 text-xs md:text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400 disabled:cursor-not-allowed"
        }
      />
    </div>
  );
}
