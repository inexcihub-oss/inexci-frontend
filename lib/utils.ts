import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseLocalDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  const m = (dateStr as string).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(dateStr as string);
}

export function formatDate(date: string | Date): string {
  const d = parseLocalDate(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

export function getDisplayName(name: string): string {
  const nameParts = name.split(" - ");
  return nameParts[0].trim();
}

export function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
    "bg-indigo-200",
  ];
  const index = (String(name).charCodeAt(0) || 0) % colors.length;
  return colors[index];
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function includesIgnoreCase(text: string, search: string): boolean {
  return normalizeForSearch(text).includes(normalizeForSearch(search));
}

export function removeBackground(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        function cornerColor(x: number, y: number): [number, number, number] {
          const idx = (y * width + x) * 4;
          return [data[idx], data[idx + 1], data[idx + 2]];
        }
        const corners = [
          cornerColor(0, 0),
          cornerColor(width - 1, 0),
          cornerColor(0, height - 1),
          cornerColor(width - 1, height - 1),
        ];
        const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
        const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
        const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;

        const tolerance = 40;
        const softRange = 20;

        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - bgR;
          const dg = data[i + 1] - bgG;
          const db = data[i + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist <= tolerance) {
            data[i + 3] = 0;
          } else if (dist <= tolerance + softRange) {
            data[i + 3] = Math.round(
              ((dist - tolerance) / softRange) * data[i + 3],
            );
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.png`, { type: "image/png" }));
        }, "image/png");
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
