// Augmentação do módulo @tanstack/react-table para suportar metadados tipados nas colunas.
// Permite o uso de `column.columnDef.meta.className` sem cast `as any`.
//
// Referência: https://tanstack.com/table/v8/docs/api/core/column-def#meta

import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends object, TValue> {
    /** Classe CSS adicional aplicada ao header e às células da coluna */
    className?: string;
  }
}
