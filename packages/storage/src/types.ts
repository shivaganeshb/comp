import type { Readable } from 'stream';

/**
 * Storage provider types - supported cloud storage backends
 */
export type StorageProviderType = 'aws' | 'gcp';

/**
 * Parameters for uploading a file to storage
 */
export interface UploadParams {
  /** Target bucket name */
  bucket: string;
  /** Object key (path within bucket) */
  key: string;
  /** File content as Buffer */
  data: Buffer;
  /** MIME type of the file */
  contentType?: string;
  /** Custom metadata to attach to the object */
  metadata?: Record<string, string>;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /** The key where the file was stored */
  key: string;
  /** Size of the uploaded file in bytes */
  size: number;
}

/**
 * Parameters for generating a signed URL
 */
export interface SignedUrlParams {
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
  /** Operation type - 'read' for download, 'write' for upload */
  operation: 'read' | 'write';
  /** URL expiration time in seconds */
  expiresIn: number;
  /** Content-Disposition header for downloads (e.g., 'attachment; filename="file.pdf"' or 'inline') */
  contentDisposition?: string;
  /** Content-Type for write operations */
  contentType?: string;
}

/**
 * Parameters for downloading a file
 */
export interface DownloadParams {
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
}

/**
 * Parameters for deleting a file
 */
export interface DeleteParams {
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
}

/**
 * Parameters for checking if a file exists
 */
export interface ExistsParams {
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
}

/**
 * Storage provider interface - abstraction over cloud storage backends
 *
 * Implementations:
 * - S3StorageProvider: AWS S3
 * - GCSStorageProvider: Google Cloud Storage
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param params Upload parameters including bucket, key, data, and optional metadata
   * @returns Upload result with key and size
   */
  upload(params: UploadParams): Promise<UploadResult>;

  /**
   * Download a file as a Buffer
   * @param params Download parameters with bucket and key
   * @returns File contents as Buffer
   */
  download(params: DownloadParams): Promise<Buffer>;

  /**
   * Get a readable stream for a file (for large files or streaming)
   * @param params Download parameters with bucket and key
   * @returns Readable stream of file contents
   */
  getStream(params: DownloadParams): Promise<Readable>;

  /**
   * Delete a file from storage
   * @param params Delete parameters with bucket and key
   */
  delete(params: DeleteParams): Promise<void>;

  /**
   * Generate a signed URL for temporary access
   * @param params Signed URL parameters
   * @returns Signed URL string
   */
  getSignedUrl(params: SignedUrlParams): Promise<string>;

  /**
   * Check if a file exists in storage
   * @param params Exists parameters with bucket and key
   * @returns true if the file exists, false otherwise
   */
  exists(params: ExistsParams): Promise<boolean>;
}

/**
 * Configuration for AWS S3 storage provider
 */
export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Configuration for GCP Cloud Storage provider
 */
export interface GCSConfig {
  projectId: string;
  /** Path to service account JSON file, or credentials object */
  credentials?: string | object;
}

/**
 * Unified storage configuration
 */
export interface StorageConfig {
  provider: StorageProviderType;
  aws?: S3Config;
  gcp?: GCSConfig;
}
