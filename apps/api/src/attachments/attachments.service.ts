import {
  getBucketName,
  getStorageProvider,
  sanitizeHeaderValue,
  type StorageProvider,
} from '@trycompai/storage';
import { AttachmentEntityType, AttachmentType, db } from '@db';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AttachmentResponseDto } from '../tasks/dto/task-responses.dto';
import { UploadAttachmentDto } from './upload-attachment.dto';

@Injectable()
export class AttachmentsService {
  private storageProvider: StorageProvider;
  private bucketName: string;
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
  private readonly SIGNED_URL_EXPIRY = 900; // 15 minutes

  constructor() {
    this.bucketName = getBucketName('attachments');
    this.storageProvider = getStorageProvider();
  }

  /**
   * Upload attachment to storage and create database record
   */
  async uploadAttachment(
    organizationId: string,
    entityId: string,
    entityType: AttachmentEntityType,
    uploadDto: UploadAttachmentDto,
    userId?: string,
  ): Promise<AttachmentResponseDto> {
    try {
      // Blocked file extensions for security
      const BLOCKED_EXTENSIONS = [
        'exe',
        'bat',
        'cmd',
        'com',
        'scr',
        'msi', // Windows executables
        'js',
        'vbs',
        'vbe',
        'wsf',
        'wsh',
        'ps1', // Scripts
        'sh',
        'bash',
        'zsh', // Shell scripts
        'dll',
        'sys',
        'drv', // System files
        'app',
        'deb',
        'rpm', // Application packages
        'jar', // Java archives (can execute)
        'pif',
        'lnk',
        'cpl', // Shortcuts and control panel
        'hta',
        'reg', // HTML apps and registry
      ];

      // Blocked MIME types for security
      const BLOCKED_MIME_TYPES = [
        'application/x-msdownload', // .exe
        'application/x-msdos-program',
        'application/x-executable',
        'application/x-sh', // Shell scripts
        'application/x-bat', // Batch files
        'text/x-sh',
        'text/x-python',
        'text/x-perl',
        'text/x-ruby',
        'application/x-httpd-php', // PHP files
        'application/x-javascript', // Executable JS (not JSON)
        'application/javascript',
        'text/javascript',
      ];

      // Validate file extension
      const fileExt = uploadDto.fileName.split('.').pop()?.toLowerCase();
      if (fileExt && BLOCKED_EXTENSIONS.includes(fileExt)) {
        throw new BadRequestException(
          `File extension '.${fileExt}' is not allowed for security reasons`,
        );
      }

      // Validate MIME type
      if (BLOCKED_MIME_TYPES.includes(uploadDto.fileType.toLowerCase())) {
        throw new BadRequestException(
          `File type '${uploadDto.fileType}' is not allowed for security reasons`,
        );
      }

      // Validate file size
      const fileBuffer = Buffer.from(uploadDto.fileData, 'base64');
      if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
        );
      }

      // Generate unique file key
      const fileId = randomBytes(16).toString('hex');
      const sanitizedFileName = this.sanitizeFileName(uploadDto.fileName);
      const timestamp = Date.now();

      // Special storage path structure for task items: org_{orgId}/attachments/task-item/{entityType}/{entityId}
      let storageKey: string;
      if (entityType === 'task_item') {
        // For task items, extract entityType and entityId from metadata
        // Metadata should contain taskItemEntityType and taskItemEntityId
        const taskItemEntityType =
          uploadDto.description?.split('|')[0] || 'unknown';
        const taskItemEntityId =
          uploadDto.description?.split('|')[1] || entityId;
        storageKey = `${organizationId}/attachments/task-item/${taskItemEntityType}/${taskItemEntityId}/${timestamp}-${fileId}-${sanitizedFileName}`;
      } else {
        storageKey = `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${fileId}-${sanitizedFileName}`;
      }

      // Upload to storage
      await this.storageProvider.upload({
        bucket: this.bucketName,
        key: storageKey,
        data: fileBuffer,
        contentType: uploadDto.fileType,
        metadata: {
          originalFileName: sanitizeHeaderValue(uploadDto.fileName),
          organizationId,
          entityId,
          entityType,
          ...(userId && { uploadedBy: userId }),
        },
      });

      // Create database record
      const attachment = await db.attachment.create({
        data: {
          name: uploadDto.fileName,
          url: storageKey,
          type: this.mapFileTypeToAttachmentType(uploadDto.fileType),
          entityId,
          entityType,
          organizationId,
        },
      });

      // Generate signed URL for immediate access
      const downloadUrl = await this.generateSignedUrl(storageKey);

      return {
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        downloadUrl,
        createdAt: attachment.createdAt,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload attachment');
    }
  }

  /**
   * Get all attachments for an entity WITH signed URLs (for backward compatibility)
   */
  async getAttachments(
    organizationId: string,
    entityId: string,
    entityType: AttachmentEntityType,
  ): Promise<AttachmentResponseDto[]> {
    const attachments = await db.attachment.findMany({
      where: {
        organizationId,
        entityId,
        entityType,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Generate signed URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const downloadUrl = await this.generateSignedUrl(attachment.url);
        return {
          id: attachment.id,
          name: attachment.name,
          type: attachment.type,
          downloadUrl,
          createdAt: attachment.createdAt,
        };
      }),
    );

    return attachmentsWithUrls;
  }

  /**
   * Get attachment metadata WITHOUT signed URLs (for on-demand URL generation)
   */
  async getAttachmentMetadata(
    organizationId: string,
    entityId: string,
    entityType: AttachmentEntityType,
  ): Promise<{ id: string; name: string; type: string; createdAt: Date }[]> {
    const attachments = await db.attachment.findMany({
      where: {
        organizationId,
        entityId,
        entityType,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      type: attachment.type,
      createdAt: attachment.createdAt,
    }));
  }

  /**
   * Get download URL for an attachment
   */
  async getAttachmentDownloadUrl(
    organizationId: string,
    attachmentId: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    try {
      // Get attachment record
      const attachment = await db.attachment.findFirst({
        where: {
          id: attachmentId,
          organizationId,
        },
      });

      if (!attachment) {
        throw new BadRequestException('Attachment not found');
      }

      // Generate signed URL
      const downloadUrl = await this.generateSignedUrl(attachment.url);

      return {
        downloadUrl,
        expiresIn: this.SIGNED_URL_EXPIRY,
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Delete attachment from storage and database
   */
  async deleteAttachment(
    organizationId: string,
    attachmentId: string,
  ): Promise<void> {
    try {
      // Get attachment record
      const attachment = await db.attachment.findFirst({
        where: {
          id: attachmentId,
          organizationId,
        },
      });

      if (!attachment) {
        throw new BadRequestException('Attachment not found');
      }

      // Delete from storage
      await this.storageProvider.delete({
        bucket: this.bucketName,
        key: attachment.url,
      });

      // Delete from database
      await db.attachment.delete({
        where: {
          id: attachmentId,
          organizationId,
        },
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete attachment');
    }
  }

  /**
   * Generate signed URL for file download
   */
  private async generateSignedUrl(storageKey: string): Promise<string> {
    return this.storageProvider.getSignedUrl({
      bucket: this.bucketName,
      key: storageKey,
      operation: 'read',
      expiresIn: this.SIGNED_URL_EXPIRY,
    });
  }

  async uploadToStorage(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    const fileId = randomBytes(16).toString('hex');
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const timestamp = Date.now();
    const storageKey = `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${fileId}-${sanitizedFileName}`;

    await this.storageProvider.upload({
      bucket: this.bucketName,
      key: storageKey,
      data: fileBuffer,
      contentType,
      metadata: {
        originalFileName: sanitizeHeaderValue(fileName),
        organizationId,
        entityId,
        entityType,
      },
    });

    return storageKey;
  }

  // Backward compatibility alias
  async uploadToS3(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    return this.uploadToStorage(fileBuffer, fileName, contentType, organizationId, entityType, entityId);
  }

  async getPresignedDownloadUrl(storageKey: string): Promise<string> {
    return this.generateSignedUrl(storageKey);
  }

  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    return this.storageProvider.download({
      bucket: this.bucketName,
      key: storageKey,
    });
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Map MIME type to AttachmentType enum
   */
  private mapFileTypeToAttachmentType(fileType: string): AttachmentType {
    const type = fileType.split('/')[0];
    switch (type) {
      case 'image':
        return AttachmentType.image;
      case 'video':
        return AttachmentType.video;
      case 'audio':
        return AttachmentType.audio;
      case 'application':
      case 'text':
        return AttachmentType.document;
      default:
        return AttachmentType.other;
    }
  }
}
