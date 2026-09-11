import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Vorzeichenbehaftete Darstellung für Trend-Deltas, z. B. `-1,4`. */
export function formatDelta(value: number, decimals = 1): string {
  const formatted = formatNumber(Math.abs(value), decimals);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}
