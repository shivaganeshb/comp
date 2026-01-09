import { SupportedOS } from '@/app/api/download-agent/types';
import {
  extractKeyFromUrl,
  getBucketName,
  getStorageProvider,
  getStorageProviderType,
  type StorageProvider,
} from '@trycompai/storage';

// Re-export bucket name for backward compatibility
export const BUCKET_NAME = getBucketName('attachments');

// Storage provider instance
let storageProviderInstance: StorageProvider | null = null;

try {
  const providerType = getStorageProviderType();

  // Only throw in development, log in production
  if (process.env.NODE_ENV !== 'production') {
    storageProviderInstance = getStorageProvider();
  } else {
    try {
      storageProviderInstance = getStorageProvider();
    } catch (error) {
      console.error('Storage provider initialization failed:', error);
    }
  }
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    throw error;
  }
  console.error('Storage credentials or configuration missing in environment variables.');
}

export const storageProvider = storageProviderInstance;

// Re-export for backward compatibility with code that uses s3Client directly
// NOTE: This only works when using AWS S3 - GCP users should use storageProvider instead
export const s3Client = storageProviderInstance && getStorageProviderType() === 'aws'
  ? (storageProviderInstance as any).getClient?.()
  : null;

// Re-export utilities
export { extractKeyFromUrl as extractS3KeyFromUrl };

export async function getFleetAgent({ os }: { os: SupportedOS }) {
  if (!storageProvider) {
    throw new Error('Storage provider not configured');
  }

  const fleetBucketName = getBucketName('fleetAgent');

  if (!fleetBucketName) {
    throw new Error('Fleet agent bucket is not configured');
  }

  const macosPackageFilename = 'Comp AI Agent-1.0.0-arm64.dmg';
  const windowsPackageFilename = 'fleet-osquery.msi';

  const key = `${os}/${os === 'macos' ? macosPackageFilename : windowsPackageFilename}`;

  const stream = await storageProvider.getStream({
    bucket: fleetBucketName,
    key,
  });

  return stream;
}

/**
 * Generates a presigned URL for downloading a file from storage
 */
export async function getPresignedDownloadUrl({
  bucketName,
  key,
  expiresIn = 3600, // 1 hour default
}: {
  bucketName: string;
  key: string;
  expiresIn?: number;
}): Promise<string> {
  if (!storageProvider) {
    throw new Error('Storage provider not configured');
  }

  return storageProvider.getSignedUrl({
    bucket: bucketName,
    key,
    operation: 'read',
    expiresIn,
  });
}

/**
 * Generates a presigned URL for uploading a file to storage
 */
export async function getPresignedUploadUrl({
  bucketName,
  key,
  contentType,
  expiresIn = 3600, // 1 hour default
}: {
  bucketName: string;
  key: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<string> {
  if (!storageProvider) {
    throw new Error('Storage provider not configured');
  }

  return storageProvider.getSignedUrl({
    bucket: bucketName,
    key,
    operation: 'write',
    expiresIn,
    contentType,
  });
}
