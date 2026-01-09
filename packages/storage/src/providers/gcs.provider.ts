import { Storage } from '@google-cloud/storage';
import type { Readable } from 'stream';
import type {
  DeleteParams,
  DownloadParams,
  ExistsParams,
  GCSConfig,
  SignedUrlParams,
  StorageProvider,
  UploadParams,
  UploadResult,
} from '../types';

/**
 * Google Cloud Storage implementation of the StorageProvider interface
 */
export class GCSStorageProvider implements StorageProvider {
  private client: Storage;

  constructor(config: GCSConfig) {
    const options: ConstructorParameters<typeof Storage>[0] = {
      projectId: config.projectId,
    };

    // Handle credentials - can be a path to JSON file or credentials object
    if (config.credentials) {
      if (typeof config.credentials === 'string') {
        options.keyFilename = config.credentials;
      } else {
        options.credentials = config.credentials as object;
      }
    }
    // If no credentials provided, will use GOOGLE_APPLICATION_CREDENTIALS env var
    // or default application credentials

    this.client = new Storage(options);
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    await file.save(params.data, {
      contentType: params.contentType,
      metadata: {
        metadata: params.metadata, // GCS nests custom metadata under 'metadata'
      },
    });

    return {
      key: params.key,
      size: params.data.length,
    };
  }

  async download(params: DownloadParams): Promise<Buffer> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    const [contents] = await file.download();
    return contents;
  }

  async getStream(params: DownloadParams): Promise<Readable> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    return file.createReadStream();
  }

  async delete(params: DeleteParams): Promise<void> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    await file.delete({ ignoreNotFound: true });
  }

  async getSignedUrl(params: SignedUrlParams): Promise<string> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    const options: Parameters<typeof file.getSignedUrl>[0] = {
      version: 'v4',
      action: params.operation === 'read' ? 'read' : 'write',
      expires: Date.now() + params.expiresIn * 1000,
    };

    if (params.contentDisposition) {
      options.responseDisposition = params.contentDisposition;
    }

    if (params.contentType && params.operation === 'write') {
      options.contentType = params.contentType;
    }

    const [url] = await file.getSignedUrl(options);
    return url;
  }

  async exists(params: ExistsParams): Promise<boolean> {
    const bucket = this.client.bucket(params.bucket);
    const file = bucket.file(params.key);

    const [exists] = await file.exists();
    return exists;
  }

  /**
   * Get the underlying GCS client for advanced operations
   * Use sparingly - prefer the abstraction methods
   */
  getClient(): Storage {
    return this.client;
  }
}

/**
 * Create a GCS storage provider from environment variables
 */
export function createGCSProviderFromEnv(): GCSStorageProvider {
  const projectId = process.env.GCP_PROJECT_ID;

  if (!projectId) {
    throw new Error('Missing required GCP environment variable: GCP_PROJECT_ID');
  }

  // Credentials can come from:
  // 1. GCP_CREDENTIALS_PATH env var (path to service account JSON)
  // 2. GOOGLE_APPLICATION_CREDENTIALS env var (standard GCP env var)
  // 3. Default application credentials (e.g., when running on GCP)
  const credentialsPath = process.env.GCP_CREDENTIALS_PATH;

  return new GCSStorageProvider({
    projectId,
    credentials: credentialsPath,
  });
}
