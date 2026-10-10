import { PriorityLevel, PRIORITY_LABELS } from "@/types/surgery-request.types";

export const priorityColors: Record<
  PriorityLevel,
  { bg: string; text: string; bgClass: string; textClass: string }
> = {
  1: {
    bg: "#D4EFE0",
    text: "#1E6F47",
    bgClass: "bg-[#D4EFE0]",
    textClass: "text-[#1E6F47]",
  },
  2: {
    bg: "#D8E8F7",
    text: "#1859A3",
    bgClass: "bg-[#D8E8F7]",
    textClass: "text-[#1859A3]",
  },
  3: {
    bg: "#FFF3D6",
    text: "#996600",
    bgClass: "bg-[#FFF3D6]",
    textClass: "text-[#996600]",
  },
  4: {
    bg: "#F4E1E3",
    text: "#7A3B3F",
    bgClass: "bg-[#F4E1E3]",
    textClass: "text-[#7A3B3F]",
  },
};

export const getPriorityLabel = (priority: PriorityLevel): string => {
  return PRIORITY_LABELS[priority];
};
