// Types
export type {
  DeleteParams,
  DownloadParams,
  ExistsParams,
  GCSConfig,
  S3Config,
  SignedUrlParams,
  StorageConfig,
  StorageProvider,
  StorageProviderType,
  UploadParams,
  UploadResult,
} from './types';

// Providers
export { GCSStorageProvider, createGCSProviderFromEnv } from './providers/gcs.provider';
export { S3StorageProvider, createS3ProviderFromEnv } from './providers/s3.provider';

// Factory
export {
  createStorageProvider,
  createStorageProviderFromEnv,
  getStorageProvider,
  getStorageProviderType,
  resetStorageProvider,
} from './factory';

// Bucket name helpers - get bucket names based on current provider
export function getBucketName(
  purpose: 'attachments' | 'questionnaire' | 'knowledgeBase' | 'orgAssets' | 'fleetAgent',
): string {
  const providerType = process.env.STORAGE_PROVIDER || 'aws';

  if (providerType === 'gcp') {
    switch (purpose) {
      case 'attachments':
        return process.env.GCP_BUCKET_NAME || '';
      case 'questionnaire':
        return process.env.GCP_QUESTIONNAIRE_BUCKET || process.env.GCP_BUCKET_NAME || '';
      case 'knowledgeBase':
        return process.env.GCP_KNOWLEDGE_BASE_BUCKET || process.env.GCP_BUCKET_NAME || '';
      case 'orgAssets':
        return process.env.GCP_ORG_ASSETS_BUCKET || process.env.GCP_BUCKET_NAME || '';
      case 'fleetAgent':
        return process.env.GCP_FLEET_AGENT_BUCKET || process.env.GCP_BUCKET_NAME || '';
      default:
        return process.env.GCP_BUCKET_NAME || '';
    }
  }

  // AWS (default)
  switch (purpose) {
    case 'attachments':
      return process.env.APP_AWS_BUCKET_NAME || '';
    case 'questionnaire':
      return process.env.APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET || process.env.APP_AWS_BUCKET_NAME || '';
    case 'knowledgeBase':
      return process.env.APP_AWS_KNOWLEDGE_BASE_BUCKET || process.env.APP_AWS_BUCKET_NAME || '';
    case 'orgAssets':
      return process.env.APP_AWS_ORG_ASSETS_BUCKET || process.env.APP_AWS_BUCKET_NAME || '';
    case 'fleetAgent':
      return process.env.FLEET_AGENT_BUCKET_NAME || process.env.APP_AWS_BUCKET_NAME || '';
    default:
      return process.env.APP_AWS_BUCKET_NAME || '';
  }
}

// Security utilities (preserved from original S3 implementation)

/**
 * Validate if a host is a valid S3 endpoint
 */
export function isValidS3Host(host: string): boolean {
  const normalizedHost = host.toLowerCase();

  if (!normalizedHost.endsWith('.amazonaws.com')) {
    return false;
  }

  return /^([\w.-]+\.)?(s3|s3-[\w-]+|s3-website[\w.-]+|s3-accesspoint|s3-control)(\.[\w-]+)?\.amazonaws\.com$/.test(
    normalizedHost,
  );
}

/**
 * Extract S3 key from a URL with security validation
 * Prevents path traversal and URL injection attacks
 */
export function extractKeyFromUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid input: URL must be a non-empty string');
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // not a URL, continue
  }

  if (parsedUrl) {
    // For GCS URLs
    if (parsedUrl.host.includes('storage.googleapis.com') ||
        parsedUrl.host.includes('storage.cloud.google.com')) {
      const key = decodeURIComponent(parsedUrl.pathname.substring(1));

      if (key.includes('../') || key.includes('..\\')) {
        throw new Error('Invalid key: Path traversal detected');
      }

      // Remove bucket name from path for GCS URLs like /bucket-name/key
      const parts = key.split('/');
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
      return key;
    }

    // For S3 URLs
    if (!isValidS3Host(parsedUrl.host)) {
      throw new Error('Invalid URL: Not a valid storage endpoint');
    }

    const key = decodeURIComponent(parsedUrl.pathname.substring(1));

    if (key.includes('../') || key.includes('..\\')) {
      throw new Error('Invalid key: Path traversal detected');
    }

    if (!key) {
      throw new Error('Invalid key: Key cannot be empty');
    }

    return key;
  }

  // Not a URL - treat as a key directly
  const lowerInput = url.toLowerCase();
  if (lowerInput.includes('://')) {
    throw new Error('Invalid input: Malformed URL detected');
  }

  // Check for domain-like patterns
  const domainPattern =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(\/|$)/i;
  if (domainPattern.test(url)) {
    throw new Error('Invalid input: Domain-like pattern detected in key');
  }

  if (url.includes('../') || url.includes('..\\')) {
    throw new Error('Invalid key: Path traversal detected');
  }

  const key = url.startsWith('/') ? url.substring(1) : url;

  if (!key) {
    throw new Error('Invalid key: Key cannot be empty');
  }

  return key;
}

/**
 * Sanitize a file name for use in storage keys
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Sanitize header value for metadata (removes control characters, non-ASCII)
 */
export function sanitizeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  const withoutControls = value.replace(/[\x00-\x1F\x7F]/g, '');
  const asciiOnly = withoutControls.replace(/[^\x20-\x7E]/g, '_');
  return asciiOnly.trim();
}
