/**
 * Utility helper functions for consistent short display name resolution
 * across the IWIB Hub platform while preserving legal/regulatory full names.
 */

export interface DisplayItem {
  name?: string | null;
  name_ar?: string | null;
  short_name?: string | null;
  short_name_ar?: string | null;
  title?: string | null;
  label?: string | null;
  [key: string]: any;
}

/**
 * Returns the short display label for a record, falling back to full name.
 * Respects Arabic (RTL) localization when isRtl is true.
 */
export function displayName(item?: DisplayItem | null, isRtl: boolean = false): string {
  if (!item) return '';

  if (isRtl) {
    return (
      item.short_name_ar?.trim() ||
      item.name_ar?.trim() ||
      item.short_name?.trim() ||
      item.name?.trim() ||
      item.title?.trim() ||
      item.label?.trim() ||
      ''
    );
  }

  return (
    item.short_name?.trim() ||
    item.name?.trim() ||
    item.short_name_ar?.trim() ||
    item.name_ar?.trim() ||
    item.title?.trim() ||
    item.label?.trim() ||
    ''
  );
}

/**
 * Returns the legal/regulatory full name for a record.
 * Respects Arabic (RTL) localization when isRtl is true.
 */
export function fullName(item?: DisplayItem | null, isRtl: boolean = false): string {
  if (!item) return '';

  if (isRtl) {
    return (
      item.name_ar?.trim() ||
      item.name?.trim() ||
      item.short_name_ar?.trim() ||
      item.short_name?.trim() ||
      item.title?.trim() ||
      item.label?.trim() ||
      ''
    );
  }

  return (
    item.name?.trim() ||
    item.short_name?.trim() ||
    item.name_ar?.trim() ||
    item.short_name_ar?.trim() ||
    item.title?.trim() ||
    item.label?.trim() ||
    ''
  );
}
