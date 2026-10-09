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

export const getPriorityClasses = (priority: PriorityLevel) => {
  return priorityColors[priority];
};

export const getPriorityLabel = (priority: PriorityLevel): string => {
  return PRIORITY_LABELS[priority];
};

export const pendencyColors = {
  pending: {
    bg: "#F0E6E4",
    text: "#E34935",
  },
  success: {
    bg: "#E6F4EA",
    text: "#137333",
  },
};

export const textColors = {
  primary: "#000000",
  secondary: "#758195",
  disabled: "#758195",
};

export const borderColors = {
  default: "#DCDFE3",
  hover: "#DCDFE3",
};
