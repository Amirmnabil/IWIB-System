/**
 * Sanitizes a filename for upload to Supabase Storage.
 * Supabase Storage only allows ASCII characters in object keys.
 * Non-ASCII characters (e.g. Arabic, Chinese, emoji) will cause a StorageApiError.
 *
 * This helper:
 *  - Preserves the file extension as-is (extensions like .pdf, .xlsx are ASCII)
 *  - Replaces any non-ASCII character in the base name with an underscore
 *  - Collapses multiple consecutive underscores into one
 *  - Trims leading/trailing underscores from the base name
 *  - Truncates base name to 80 characters to avoid overly long keys
 */
export function sanitizeStorageFilename(originalName: string): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  const hasExtension = lastDotIndex !== -1 && lastDotIndex < originalName.length - 1;

  const baseName = hasExtension ? originalName.substring(0, lastDotIndex) : originalName;
  const ext = hasExtension ? originalName.substring(lastDotIndex) : ''; // includes the dot

  // Replace non-ASCII characters with underscore
  const safeBase = baseName
    .replace(/[^\x00-\x7F]/g, '_')       // Non-ASCII → underscore
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')   // Other disallowed chars → underscore
    .replace(/_+/g, '_')                  // Collapse consecutive underscores
    .replace(/^_+|_+$/g, '')             // Trim leading/trailing underscores
    .substring(0, 80)                     // Limit base name length
    || 'file';                            // Fallback if entire name was non-ASCII

  return `${safeBase}${ext}`;
}
