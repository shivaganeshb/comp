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

<<<<<<< HEAD
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
=======
if (!APP_AWS_ACCESS_KEY_ID || !APP_AWS_SECRET_ACCESS_KEY || !BUCKET_NAME || !APP_AWS_REGION) {
  console.warn(
    'AWS S3 credentials or configuration missing in environment variables. File upload features will be unavailable.',
  );
}

// Create a single S3 client instance
// Add null checks or assertions if the checks above don't guarantee non-null values
export const s3Client = new S3Client({
  endpoint: APP_AWS_ENDPOINT || undefined,
  region: APP_AWS_REGION!,
  credentials: {
    accessKeyId: APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: APP_AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: !!APP_AWS_ENDPOINT,
});

// Ensure BUCKET_NAME is exported and non-null checked if needed elsewhere explicitly
if (!BUCKET_NAME && process.env.NODE_ENV === 'production') {
  console.error('AWS_BUCKET_NAME is not defined.');
}

/**
 * Validates if a hostname is a valid AWS S3 endpoint
 */
function isValidS3Host(host: string): boolean {
  const normalizedHost = host.toLowerCase();

  // Must end with amazonaws.com
  if (!normalizedHost.endsWith('.amazonaws.com')) {
    return false;
  }

  // Check against known S3 patterns
  return /^([\w.-]+\.)?(s3|s3-[\w-]+|s3-website[\w.-]+|s3-accesspoint|s3-control)(\.[\w-]+)?\.amazonaws\.com$/.test(
    normalizedHost,
  );
}

/**
 * Extracts S3 object key from either a full S3 URL or a plain key
 * @throws {Error} If the input is invalid or potentially malicious
 */
export function extractS3KeyFromUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid input: URL must be a non-empty string');
  }

  // Try to parse as URL
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // Not a valid URL - will handle as S3 key below
  }

  if (parsedUrl) {
    // Validate it's an S3 URL
    if (!isValidS3Host(parsedUrl.host)) {
      throw new Error('Invalid URL: Not a valid S3 endpoint');
>>>>>>> upstream/main
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
