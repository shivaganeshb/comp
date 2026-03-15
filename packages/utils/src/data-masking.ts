/**
 * PII Data Masking Utilities for SOC2 Compliance
 *
 * Provides functions to mask sensitive data before logging.
 * Never log passwords, tokens, API keys, or PII in plaintext.
 */

// Fields whose values should be fully redacted (never logged)
const REDACTED_FIELDS = new Set([
  'password',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'secret',
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
]);

// Fields whose values should be masked (partially visible)
const MASKED_FIELDS = new Set([
  'email',
  'toEmail',
  'userEmail',
  'requesterEmail',
  'inviteeEmail',
  'apiKey',
  'api_key',
  'x-api-key',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'sessionToken',
  'session_token',
  'ip',
  'ipAddress',
  'ip_address',
  'x-forwarded-for',
  'x-real-ip',
]);

/**
 * Masks an email address for safe logging.
 * Example: john.doe@company.com -> j***@company.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[invalid-email]';
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return '[invalid-email]';
  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex);
  if (local.length <= 1) return `${local}***${domain}`;
  return `${local[0]}***${domain}`;
}

/**
 * Masks an API key for safe logging.
 * Example: sk_live_abc123xyz789 -> sk_...x789
 */
export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '[invalid-key]';
  if (key.length <= 8) return '***';
  const last4 = key.slice(-4);
  // Preserve prefix if it has one (e.g., sk_, pk_, tr_)
  const underscoreIdx = key.indexOf('_');
  if (underscoreIdx > 0 && underscoreIdx <= 4) {
    const prefix = key.substring(0, underscoreIdx + 1);
    return `${prefix}...${last4}`;
  }
  return `***...${last4}`;
}

/**
 * Masks a bearer/auth token for safe logging.
 * Example: eyJhbGciOiJIUzI1... -> eyJ...last4
 */
export function maskToken(token: string): string {
  if (!token || typeof token !== 'string') return '[invalid-token]';
  // Strip "Bearer " prefix if present
  const cleaned = token.startsWith('Bearer ') ? token.substring(7) : token;
  if (cleaned.length <= 8) return '***';
  return `${cleaned.substring(0, 3)}...${cleaned.slice(-4)}`;
}

/**
 * Masks an IP address for safe logging.
 * IPv4: 192.168.1.100 -> 192.168.xxx.xxx
 * IPv6: truncated
 */
export function maskIp(ip: string): string {
  if (!ip || typeof ip !== 'string') return '[invalid-ip]';
  // IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  // IPv6 - just show first segment
  if (ip.includes(':')) {
    const firstSegment = ip.split(':')[0];
    return `${firstSegment}:***`;
  }
  return '***';
}

/**
 * Masks a single value based on the field name.
 */
function maskFieldValue(fieldName: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const lowerField = fieldName.toLowerCase();

  // Fully redact sensitive fields
  if (REDACTED_FIELDS.has(fieldName) || REDACTED_FIELDS.has(lowerField)) {
    return '[REDACTED]';
  }

  if (typeof value !== 'string') return value;

  // Check for email fields
  if (
    lowerField.includes('email') ||
    lowerField === 'to' ||
    lowerField === 'from'
  ) {
    // Only mask if it looks like an email
    if (value.includes('@')) {
      return maskEmail(value);
    }
  }

  // Check for API key fields
  if (lowerField.includes('apikey') || lowerField.includes('api_key') || lowerField === 'x-api-key') {
    return maskApiKey(value);
  }

  // Check for token/auth fields
  if (
    lowerField.includes('token') ||
    lowerField === 'authorization' ||
    lowerField === 'cookie'
  ) {
    return maskToken(value);
  }

  // Check for IP fields
  if (lowerField.includes('ip') || lowerField === 'x-forwarded-for' || lowerField === 'x-real-ip') {
    return maskIp(value);
  }

  // Check for password fields (catch-all)
  if (lowerField.includes('password') || lowerField.includes('secret')) {
    return '[REDACTED]';
  }

  return value;
}

/**
 * Recursively sanitizes an object for safe logging.
 * Masks emails, API keys, tokens, IPs and redacts passwords.
 *
 * @param obj - The object to sanitize
 * @param maxDepth - Maximum recursion depth (default: 5)
 * @returns A new object with sensitive fields masked
 */
export function sanitizeForLog<T>(obj: T, maxDepth = 5): T {
  if (maxDepth <= 0) return '[max depth]' as unknown as T;
  if (obj === null || obj === undefined) return obj;

  // Handle strings - check if it looks like an email or token
  if (typeof obj === 'string') {
    // Check for email pattern in raw strings
    if (obj.includes('@') && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(obj)) {
      return maskEmail(obj) as unknown as T;
    }
    return obj;
  }

  if (typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item, maxDepth - 1)) as unknown as T;
  }

  // Handle plain objects
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    // Check if this field needs masking
    if (REDACTED_FIELDS.has(key) || REDACTED_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (MASKED_FIELDS.has(key) || MASKED_FIELDS.has(lowerKey)) {
      sanitized[key] = maskFieldValue(key, value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value, maxDepth - 1);
    } else if (typeof value === 'string' && value.includes('@') && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      // Catch emails in non-standard field names
      sanitized[key] = maskEmail(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitizes HTTP headers for safe logging.
 * Specifically targets authorization, cookie, and API key headers.
 */
export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const sanitized: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'authorization') {
      sanitized[key] = typeof value === 'string' ? maskToken(value) : '[REDACTED]';
    } else if (lowerKey === 'cookie' || lowerKey === 'set-cookie') {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey === 'x-api-key') {
      sanitized[key] = typeof value === 'string' ? maskApiKey(value) : '[REDACTED]';
    } else if (lowerKey === 'x-forwarded-for' || lowerKey === 'x-real-ip') {
      sanitized[key] = typeof value === 'string' ? maskIp(value) : '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
