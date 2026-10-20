"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = "teal",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: "teal" | "amber" | "green" | "blue" | "red" | "violet";
}) {
  const trendColors = {
    up: "text-emerald-600 bg-emerald-50",
    down: "text-red-600 bg-red-50",
    neutral: "text-gray-500 bg-gray-50",
  };

  const iconBgMap = {
    teal: "bg-teal-50",
    amber: "bg-amber-50",
    green: "bg-emerald-50",
    blue: "bg-blue-50",
    red: "bg-red-50",
    violet: "bg-violet-50",
  };

  const iconFilterMap = {
    teal: "[filter:invert(35%)_sepia(80%)_saturate(400%)_hue-rotate(140deg)]",
    amber: "[filter:invert(55%)_sepia(90%)_saturate(500%)_hue-rotate(5deg)]",
    green: "[filter:invert(45%)_sepia(70%)_saturate(500%)_hue-rotate(100deg)]",
    blue: "[filter:invert(40%)_sepia(80%)_saturate(500%)_hue-rotate(200deg)]",
    red: "[filter:invert(35%)_sepia(80%)_saturate(600%)_hue-rotate(330deg)]",
    violet: "[filter:invert(40%)_sepia(60%)_saturate(500%)_hue-rotate(250deg)]",
  };

  return (
    <Card className="border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-xl ${iconBgMap[color]}`}>
            <Image
              src={icon}
              alt=""
              width={20}
              height={20}
              className={iconFilterMap[color]}
            />
          </div>
          {trend && trendLabel && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendColors[trend]}`}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
          {value}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function FinancialKPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: "green" | "blue" | "amber";
}) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  const iconBgMap = {
    green: "bg-emerald-100",
    blue: "bg-blue-100",
    amber: "bg-amber-100",
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border ${colorMap[color]}`}
    >
      <div className={`p-2.5 rounded-lg ${iconBgMap[color]}`}>
        <Image src={icon} alt="" width={20} height={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-xl font-semibold tracking-tight truncate">
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

export function AlertCard({
  title,
  count,
  description,
  color,
  icon,
}: {
  title: string;
  count: number;
  description: string;
  color: "amber" | "red" | "blue";
  icon: string;
}) {
  const colorMap = {
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
  };
  const textMap = {
    amber: "text-amber-800",
    red: "text-red-800",
    blue: "text-blue-800",
  };
  const badgeMap = {
    amber: "bg-amber-200 text-amber-800",
    red: "bg-red-200 text-red-800",
    blue: "bg-blue-200 text-blue-800",
  };

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colorMap[color]}`}
    >
      <Image src={icon} alt="" width={18} height={18} className="opacity-70" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textMap[color]}`}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span
        className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${badgeMap[color]}`}
      >
        {count}
      </span>
    </div>
  );
}
