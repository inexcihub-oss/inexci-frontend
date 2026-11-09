import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminPager({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="ds-caption">
        Página {page} de {pages}
      </span>
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="ds-toolbar-btn ds-toolbar-icon"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Próxima página"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="ds-toolbar-btn ds-toolbar-icon"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
