"use client";

import Input from "@/components/ui/Input";

interface PeriodFilterProps {
  from: string;
  to: string;
  onChange: (periodo: { from: string; to: string }) => void;
  error?: string | null;
  idPrefix: string;
}

export function PeriodFilter({
  from,
  to,
  onChange,
  error,
  idPrefix,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Input
          id={`${idPrefix}-de`}
          type="date"
          label="De"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
        />
        <Input
          id={`${idPrefix}-ate`}
          type="date"
          label="Até"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
