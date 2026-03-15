/**
 * Shared input sanitization utilities for SOC2 compliance.
 *
 * These helpers are intentionally kept dependency-free so they can be imported
 * from both the NestJS API and the Next.js frontend without pulling in extra
 * packages.
 */

// ---------------------------------------------------------------------------
// HTML / XSS sanitization
// ---------------------------------------------------------------------------

/**
 * Strip all HTML tags from a string.
 *
 * The loop protects against nested/recursive tags such as `<<script>script>`.
 */
export function stripHtmlTags(value: string): string {
  let sanitized = value;
  let previous: string;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } while (sanitized !== previous);
  return sanitized;
}

/**
 * Escape the five HTML-special characters so a value can be safely embedded
 * in an HTML context without triggering XSS.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

/** File extensions that must never be uploaded. */
export const BLOCKED_FILE_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'scr', 'msi',        // Windows executables
  'js', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1',          // Scripts
  'sh', 'bash', 'zsh',                                // Shell scripts
  'dll', 'sys', 'drv',                                // System files
  'app', 'deb', 'rpm',                                // Application packages
  'jar',                                               // Java archives (can execute)
  'pif', 'lnk', 'cpl',                                // Shortcuts and control panel
  'hta', 'reg',                                        // HTML apps and registry
  'php', 'php3', 'php4', 'php5', 'phtml',             // PHP files
] as const;

/** MIME types that must never be uploaded. */
export const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'text/x-sh',
  'text/x-python',
  'text/x-perl',
  'text/x-ruby',
  'application/x-httpd-php',
  'application/x-javascript',
  'application/javascript',
  'text/javascript',
] as const;

/**
 * Returns `true` if the file extension is blocked.
 * Accepts a full file name or a bare extension.
 */
export function isBlockedFileExtension(fileNameOrExt: string): boolean {
  const ext = fileNameOrExt.includes('.')
    ? fileNameOrExt.split('.').pop()?.toLowerCase() ?? ''
    : fileNameOrExt.toLowerCase();
  return (BLOCKED_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Returns `true` if the MIME type is blocked. */
export function isBlockedMimeType(mimeType: string): boolean {
  return (BLOCKED_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

// ---------------------------------------------------------------------------
// Path traversal prevention
// ---------------------------------------------------------------------------

/**
 * Sanitize a file name so it is safe for use in storage keys and
 * Content-Disposition headers.  Strips path separators, null bytes, and
 * non-ASCII characters.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\0/g, '')                       // null bytes
    .replace(/\.\./g, '')                     // directory traversal
    .replace(/[/\\]/g, '_')                   // path separators
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');       // anything unexpected
}

/**
 * Sanitize a string for safe embedding in an HTTP header value.
 * Removes control characters and non-ASCII bytes.
 */
export function sanitizeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, '').replace(/[^\x20-\x7E]/g, '_').trim();
}

// ---------------------------------------------------------------------------
// Generic string constraints (useful in Zod transforms or DTO validators)
// ---------------------------------------------------------------------------

/** Maximum sane length for a single-line text field (e.g. name, title). */
export const MAX_SINGLE_LINE_LENGTH = 255;

/** Maximum sane length for a multi-line text field (e.g. description, comment). */
export const MAX_MULTI_LINE_LENGTH = 5000;
