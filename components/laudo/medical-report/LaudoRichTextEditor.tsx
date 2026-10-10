"use client";

import dynamic from "next/dynamic";

export const LaudoRichTextEditor = dynamic(
  () =>
    import("@/components/shared/RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[80px] animate-pulse rounded-lg border border-neutral-200 bg-neutral-50" />
    ),
  },
);
