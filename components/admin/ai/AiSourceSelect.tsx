import { ADMIN_FILTER_CONTROL } from "@/components/admin/AdminFilters";
import { AI_SOURCE_LABELS, AI_SOURCES, type AiSource } from "@/lib/admin-ai";

export function AiSourceSelect({
  value,
  onChange,
}: {
  value: AiSource | "";
  onChange: (value: AiSource | "") => void;
}) {
  return (
    <select
      aria-label="Origem"
      className={ADMIN_FILTER_CONTROL}
      value={value}
      onChange={(e) => onChange(e.target.value as AiSource | "")}
    >
      <option value="">Todas as origens</option>
      {AI_SOURCES.map((source) => (
        <option key={source} value={source}>
          {AI_SOURCE_LABELS[source]}
        </option>
      ))}
    </select>
  );
}
