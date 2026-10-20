import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState, SortingState } from "@tanstack/react-table";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";

export interface CadastroListService {
  delete: (id: string) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
}

interface UseCadastroListOptions<T> {
  queryKey: readonly unknown[];
  items: T[];
  service: CadastroListService;
  searchFields?: (item: T) => Array<string | null | undefined>;
  onDeleted?: (ids: string[]) => void;
}

interface DeleteState {
  open: boolean;
  id: string | null;
  name: string | null;
  loading: boolean;
}

const CLOSED_DELETE: DeleteState = {
  open: false,
  id: null,
  name: null,
  loading: false,
};

const defaultSearchFields = (item: { name: string; email?: string }) => [
  item.name,
  item.email,
];

export function useCadastroList<
  T extends { id: string; name: string; email?: string },
>({
  queryKey,
  items,
  service,
  searchFields,
  onDeleted,
}: UseCadastroListOptions<T>) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteState, setDeleteState] = useState<DeleteState>(CLOSED_DELETE);
  const [bulkDelete, setBulkDelete] = useState({ open: false, loading: false });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const fieldsOf = searchFields ?? defaultSearchFields;

  const filtered = useMemo(() => {
    if (!debouncedSearchTerm) return items;
    const search = debouncedSearchTerm.toLowerCase();
    return items.filter((item) =>
      fieldsOf(item).some((value) =>
        (value ?? "").toLowerCase().includes(search),
      ),
    );
  }, [items, debouncedSearchTerm, fieldsOf]);

  const selectedItems = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((key) => filtered[parseInt(key, 10)])
        .filter(Boolean),
    [rowSelection, filtered],
  );

  const removeFromCache = (ids: string[]) =>
    queryClient.setQueryData<T[]>(queryKey, (prev = []) =>
      prev.filter((item) => !ids.includes(item.id)),
    );

  const requestDelete = (item: T, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteState({ open: true, id: item.id, name: item.name, loading: false });
  };

  const confirmDelete = async () => {
    const id = deleteState.id;
    if (!id) return;
    setDeleteState((prev) => ({ ...prev, loading: true }));
    try {
      await service.delete(id);
      onDeleted?.([id]);
      removeFromCache([id]);
      setDeleteState(CLOSED_DELETE);
    } catch (error) {
      logger.error("Erro ao excluir:", error);
      setDeleteState((prev) => ({ ...prev, loading: false }));
    }
  };

  const cancelDelete = () => {
    if (!deleteState.loading) setDeleteState(CLOSED_DELETE);
  };

  const confirmBulkDelete = async () => {
    const ids = selectedItems.map((item) => item.id);
    setBulkDelete((prev) => ({ ...prev, loading: true }));
    try {
      await service.deleteMany(ids);
      onDeleted?.(ids);
      removeFromCache(ids);
      setRowSelection({});
      setBulkDelete({ open: false, loading: false });
    } catch (error) {
      logger.error("Erro ao excluir em lote:", error);
      setBulkDelete((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    filtered,
    rowSelection,
    setRowSelection,
    sorting,
    setSorting,
    selectedItems,
    deleteState,
    requestDelete,
    confirmDelete,
    cancelDelete,
    bulkDelete,
    openBulkDelete: () => setBulkDelete({ open: true, loading: false }),
    cancelBulkDelete: () => {
      if (!bulkDelete.loading) setBulkDelete({ open: false, loading: false });
    },
    confirmBulkDelete,
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}
