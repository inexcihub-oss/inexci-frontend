export interface SupplierOption {
  id?: string;
  name: string;
}

export interface OpmeItemForm {
  id?: string;
  name: string;
  manufacturers: string[];
  suppliers: SupplierOption[];
  quantity: number;
}

export const MIN_OPTIONS = 3;

export function emptySupplierSlots(): SupplierOption[] {
  return Array.from({ length: MIN_OPTIONS }, () => ({ name: "" }));
}

export function emptyManufacturerSlots(): string[] {
  return Array.from({ length: MIN_OPTIONS }, () => "");
}

export function padManufacturers(items: string[]): string[] {
  if (items.length >= MIN_OPTIONS) return items;
  return [
    ...items,
    ...Array.from({ length: MIN_OPTIONS - items.length }, () => ""),
  ];
}

export function padSuppliers(items: SupplierOption[]): SupplierOption[] {
  if (items.length >= MIN_OPTIONS) return items;
  return [
    ...items,
    ...Array.from({ length: MIN_OPTIONS - items.length }, () => ({ name: "" })),
  ];
}

export function normalizeOptionName(name: string): string {
  return name.trim().toLowerCase();
}

export function formatCreatedNames(names: string[]): string {
  if (names.length <= 4) {
    return names.join(", ");
  }

  const visible = names.slice(0, 4).join(", ");
  return `${visible} e mais ${names.length - 4}`;
}
