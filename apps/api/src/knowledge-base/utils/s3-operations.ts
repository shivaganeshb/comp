import {
  getBucketName,
  getStorageProvider,
  sanitizeHeaderValue,
  type StorageProvider,
} from '@trycompai/storage';
import { randomBytes } from 'crypto';
import {
  MAX_FILE_SIZE_BYTES,
  SIGNED_URL_EXPIRATION_SECONDS,
  sanitizeFileName,
  generateS3Key,
} from './constants';

export interface UploadResult {
  s3Key: string;
  fileSize: number;
}

export interface SignedUrlResult {
  signedUrl: string;
}

let storageProvider: StorageProvider | null = null;
let bucketName: string = '';

function getProvider(): StorageProvider {
  if (!storageProvider) {
    storageProvider = getStorageProvider();
    bucketName = getBucketName('knowledgeBase');
  }
  return storageProvider;
}

/**
 * Validates that storage is configured
 */
export function validateS3Config(): void {
  const provider = getProvider();
  if (!provider) {
    throw new Error('Storage provider not configured');
  }

  if (!bucketName) {
    throw new Error(
      'Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET or GCP_KNOWLEDGE_BASE_BUCKET environment variable.',
    );
  }
}

/**
 * Uploads a document to storage
 */
export async function uploadToS3(
  organizationId: string,
  fileName: string,
  fileType: string,
  fileData: string,
): Promise<UploadResult> {
  validateS3Config();
  const provider = getProvider();

  // Convert base64 to buffer
  const fileBuffer = Buffer.from(fileData, 'base64');

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
    );
  }

  // Generate unique file key
  const fileId = randomBytes(16).toString('hex');
  const sanitized = sanitizeFileName(fileName);
  const s3Key = generateS3Key(organizationId, fileId, sanitized);

  // Upload to storage
  await provider.upload({
    bucket: bucketName,
    key: s3Key,
    data: fileBuffer,
    contentType: fileType,
    metadata: {
      originalFileName: sanitizeHeaderValue(fileName),
      organizationId,
    },
  });

  return {
    s3Key,
    fileSize: fileBuffer.length,
  };
}

/**
 * Generates a signed URL for downloading a document
 */
export async function generateDownloadUrl(
  s3Key: string,
  fileName: string,
): Promise<SignedUrlResult> {
  validateS3Config();
  const provider = getProvider();

  const signedUrl = await provider.getSignedUrl({
    bucket: bucketName,
    key: s3Key,
    operation: 'read',
    expiresIn: SIGNED_URL_EXPIRATION_SECONDS,
    contentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  });

  return { signedUrl };
}

/**
 * Generates a signed URL for viewing a document in browser
 */
export async function generateViewUrl(
  s3Key: string,
  fileName: string,
  _fileType: string,
): Promise<SignedUrlResult> {
  validateS3Config();
  const provider = getProvider();

  const signedUrl = await provider.getSignedUrl({
    bucket: bucketName,
    key: s3Key,
    operation: 'read',
    expiresIn: SIGNED_URL_EXPIRATION_SECONDS,
    contentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
  });

  return { signedUrl };
}

/**
 * Deletes a document from storage
 * Returns true if successful, false if error (non-throwing)
 */
export async function deleteFromS3(s3Key: string): Promise<boolean> {
  try {
    validateS3Config();
    const provider = getProvider();

    await provider.delete({
      bucket: bucketName,
      key: s3Key,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a document from storage as Buffer
 */
export async function downloadFromStorage(s3Key: string): Promise<Buffer> {
  validateS3Config();
  const provider = getProvider();

  return provider.download({
    bucket: bucketName,
    key: s3Key,
  });
}
