import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "N/A";
  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(val);
  return formatted.replace(/([KMB])/i, ' $1');
}

/**
 * Converts Supabase signed storage URLs (which fail with InvalidJWT after token expiry)
 * into direct public storage URLs for public bucket files.
 */
export function getCleanStorageUrl(url?: string | null): string {
  if (!url) return '';
  try {
    let cleanUrl = url;
    if (cleanUrl.includes('/storage/v1/object/sign/')) {
      cleanUrl = cleanUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
    }
    if (cleanUrl.includes('?')) {
      cleanUrl = cleanUrl.split('?')[0];
    }
    return cleanUrl;
  } catch {
    return url || '';
  }
}

