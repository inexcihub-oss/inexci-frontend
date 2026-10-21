"use client";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const paginas = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  if (paginas <= 1) return null;
  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-2 text-sm"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <span className="text-neutral-600">
        Página {page} de {paginas}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= paginas}
        className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </nav>
  );
}
