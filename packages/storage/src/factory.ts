import { createGCSProviderFromEnv, GCSStorageProvider } from './providers/gcs.provider';
import { createS3ProviderFromEnv, S3StorageProvider } from './providers/s3.provider';
import type {
  GCSConfig,
  S3Config,
  StorageProvider,
  StorageProviderType,
} from './types';

/**
 * Create a storage provider based on explicit configuration
 */
export function createStorageProvider(
  type: 'aws',
  config: S3Config,
): S3StorageProvider;
export function createStorageProvider(
  type: 'gcp',
  config: GCSConfig,
): GCSStorageProvider;
export function createStorageProvider(
  type: StorageProviderType,
  config: S3Config | GCSConfig,
): StorageProvider {
  switch (type) {
    case 'aws':
      return new S3StorageProvider(config as S3Config);
    case 'gcp':
      return new GCSStorageProvider(config as GCSConfig);
    default:
      throw new Error(`Unknown storage provider type: ${type}`);
  }
}

/**
 * Create a storage provider from environment variables
 *
 * Uses STORAGE_PROVIDER env var to determine which provider to use:
 * - 'aws' (default): Uses AWS S3 with APP_AWS_* env vars
 * - 'gcp': Uses Google Cloud Storage with GCP_* env vars
 */
export function createStorageProviderFromEnv(): StorageProvider {
  const providerType = (process.env.STORAGE_PROVIDER || 'aws') as StorageProviderType;

  switch (providerType) {
    case 'aws':
      return createS3ProviderFromEnv();
    case 'gcp':
      return createGCSProviderFromEnv();
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER: ${providerType}. Valid values are 'aws' or 'gcp'`,
      );
  }
}

/**
 * Get the current storage provider type from environment
 */
export function getStorageProviderType(): StorageProviderType {
  return (process.env.STORAGE_PROVIDER || 'aws') as StorageProviderType;
}

// Singleton instance for the default provider
let defaultProvider: StorageProvider | null = null;

/**
 * Get the default storage provider instance (singleton)
 * Creates the provider on first call using environment variables
 */
export function getStorageProvider(): StorageProvider {
  if (!defaultProvider) {
    defaultProvider = createStorageProviderFromEnv();
  }
  return defaultProvider;
}

/**
 * Reset the default provider (useful for testing)
 */
export function resetStorageProvider(): void {
  defaultProvider = null;
}
