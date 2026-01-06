/**
 * Utility functions for STO handles and names.
 */

/**
 * Encodes an STO handle for use in a URL (replacing # with ~).
 * @param handle The STO handle (e.g., Username#1234).
 * @returns The encoded handle (e.g., Username~1234).
 */
export function encodeStoHandle(handle: string): string {
  if (!handle) return '';
  return handle.replaceAll('#', '~');
}

/**
 * Decodes an STO handle from a URL (replacing ~ with #).
 * @param encodedHandle The encoded handle from the URL.
 * @returns The decoded handle.
 */
export function decodeStoHandle(encodedHandle: string): string {
  if (!encodedHandle) return '';
  return encodedHandle.replaceAll('~', '#');
}

/**
 * Generates a URL-friendly slug from a character name.
 * @param name The character name.
 * @returns The generated slug.
 */
export function slugifyCharacterName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s.-]/g, '') // Remove special chars except dots and hyphens
    .replaceAll(/\s+/g, '-'); // Replace spaces with hyphens
}
