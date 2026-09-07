/**
 * Helpers for turning a user-facing document name into something safe to
 * display, and into a collision-free name to store on disk.
 */

/** Strips a trailing ".pdf" only — not an occurrence in the middle of the name. */
export function stripPdfExtension(name: string): string {
  return name.replace(/\.pdf$/i, '');
}

/** Escapes a string for interpolation into HTML text content or an attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the on-disk file name for a saved PDF.
 *
 * Sanitising alone is not enough: "my file.pdf" and "my-file.pdf" both collapse
 * to "my_file.pdf", so two distinct documents would share one path — silently
 * overwriting each other, and deleting one would delete the other's file.
 * Prefixing the document's unique id keeps them apart.
 */
export function buildStoredFileName(id: string, originalName: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const base = stripPdfExtension(originalName)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Leave room for the id prefix and extension within typical 255-byte limits.
    .slice(0, 100);
  return `${safeId}-${base || 'document'}.pdf`;
}
