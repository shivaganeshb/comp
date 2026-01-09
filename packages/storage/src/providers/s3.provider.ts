import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';
import type {
  DeleteParams,
  DownloadParams,
  ExistsParams,
  S3Config,
  SignedUrlParams,
  StorageProvider,
  UploadParams,
  UploadResult,
} from '../types';

/**
 * AWS S3 implementation of the StorageProvider interface
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.data,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });

    await this.client.send(command);

    return {
      key: params.key,
      size: params.data.length,
    };
  }

  async download(params: DownloadParams): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`No data received for key: ${params.key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async getStream(params: DownloadParams): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`No data received for key: ${params.key}`);
    }

    // AWS SDK v3 returns a readable stream
    return response.Body as Readable;
  }

  async delete(params: DeleteParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    await this.client.send(command);
  }

  async getSignedUrl(params: SignedUrlParams): Promise<string> {
    if (params.operation === 'read') {
      const command = new GetObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        ResponseContentDisposition: params.contentDisposition,
      });

      return getSignedUrl(this.client, command, {
        expiresIn: params.expiresIn,
      });
    } else {
      // Write operation - for pre-signed upload URLs
      const command = new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        ContentType: params.contentType,
      });

      return getSignedUrl(this.client, command, {
        expiresIn: params.expiresIn,
      });
    }
  }

  async exists(params: ExistsParams): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      // Check if it's a "not found" error
      if (
        error instanceof Error &&
        (error.name === 'NotFound' || error.name === 'NoSuchKey')
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get the underlying S3 client for advanced operations
   * Use sparingly - prefer the abstraction methods
   */
  getClient(): S3Client {
    return this.client;
  }
}

/**
 * Create an S3 storage provider from environment variables
 */
export function createS3ProviderFromEnv(): S3StorageProvider {
  const region = process.env.APP_AWS_REGION;
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing required AWS environment variables: APP_AWS_REGION, APP_AWS_ACCESS_KEY_ID, APP_AWS_SECRET_ACCESS_KEY',
    );
  }

  return new S3StorageProvider({
    region,
    accessKeyId,
    secretAccessKey,
  });
}
