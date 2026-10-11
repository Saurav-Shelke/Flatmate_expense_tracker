import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Money formatting helpers
 */
export const paise = (rupees: number | string): number =>
  Math.round(parseFloat(String(rupees || 0)) * 100);
export const rupeesToPaise = paise;

export const rupees = (paiseVal: number | string): string =>
  (parseInt(String(paiseVal || 0), 10) / 100).toFixed(2);

export const fmt = (paiseVal: number | string): string => {
  const p = parseInt(String(paiseVal || 0), 10);
  return '₹' + (p / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
export const formatPaise = fmt;

/**
 * Local device date in YYYY-MM-DD
 */
export const today = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const getLocalDateString = today;

/**
 * Friendly localized date formatter
 */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [year, month, day] = d.split('T')[0].split('-');
    const localDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return localDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime())
    ? String(d)
    : dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}
