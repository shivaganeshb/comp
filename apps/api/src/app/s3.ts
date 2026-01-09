import {
  extractKeyFromUrl,
  getBucketName,
  getStorageProvider,
  getStorageProviderType,
  isValidS3Host,
  sanitizeFileName,
  sanitizeHeaderValue,
  type StorageProvider,
} from '@trycompai/storage';
import { Logger } from '@nestjs/common';
import '../config/load-env';

const logger = new Logger('Storage');

// Re-export bucket names for backward compatibility
export const BUCKET_NAME = getBucketName('attachments');
export const APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET = getBucketName('questionnaire');
export const APP_AWS_KNOWLEDGE_BASE_BUCKET = getBucketName('knowledgeBase');
export const APP_AWS_ORG_ASSETS_BUCKET = getBucketName('orgAssets');

// Storage provider instance
let storageProviderInstance: StorageProvider | null = null;

try {
  const providerType = getStorageProviderType();
  logger.log(`Initializing storage provider: ${providerType}`);

  storageProviderInstance = getStorageProvider();
  logger.log(`Storage provider initialized successfully: ${providerType}`);
} catch (error) {
  logger.error(
    'FAILED TO INITIALIZE STORAGE PROVIDER',
    error instanceof Error ? error.stack : error,
  );
  storageProviderInstance = null;
  logger.error(
    '[Storage] Creating dummy storage client - file uploads will fail until credentials are fixed',
  );
}

export const storageProvider = storageProviderInstance;

// Re-export for backward compatibility with code that uses s3Client directly
// NOTE: This only works when using AWS S3 - GCP users should use storageProvider instead
export const s3Client = storageProviderInstance && getStorageProviderType() === 'aws'
  ? (storageProviderInstance as any).getClient?.()
  : null;

// Re-export utilities
export { extractKeyFromUrl as extractS3KeyFromUrl, isValidS3Host, sanitizeFileName, sanitizeHeaderValue };

/**
 * Get fleet agent download - provider-agnostic implementation
 */
export async function getFleetAgent({
  os,
}: {
  os: 'macos' | 'windows' | 'linux';
}): Promise<NodeJS.ReadableStream | null> {
  if (!storageProvider) {
    throw new Error('Storage provider not configured');
  }

  const fleetBucketName = getBucketName('fleetAgent');
  const fleetAgentFileName = 'Comp AI Agent-1.0.0-arm64.dmg';

  if (!fleetBucketName) {
    throw new Error('Fleet agent bucket is not configured');
  }

  const stream = await storageProvider.getStream({
    bucket: fleetBucketName,
    key: `${os}/${fleetAgentFileName}`,
  });

  return stream;
}
