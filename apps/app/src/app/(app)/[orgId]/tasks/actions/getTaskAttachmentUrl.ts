'use server';

import { BUCKET_NAME, extractS3KeyFromUrl, storageProvider } from '@/app/s3';
import { auth } from '@/utils/auth';
import { AttachmentEntityType, db } from '@db';
import { headers } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  attachmentId: z.string(),
});

export const getTaskAttachmentUrl = async (input: z.infer<typeof schema>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { attachmentId } = input;
  const organizationId = session?.session?.activeOrganizationId;

  if (!organizationId) {
    return {
      success: false,
      error: 'Not authorized - no organization found',
    } as const;
  }

  if (!storageProvider) {
    return {
      success: false,
      error: 'Storage service is unavailable',
    } as const;
  }

  try {
    // 1. Find the attachment and verify ownership/type
    const attachment = await db.attachment.findUnique({
      where: {
        id: attachmentId,
        organizationId: organizationId,
        entityType: AttachmentEntityType.task, // Ensure it's a task attachment
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found or access denied',
      } as const;
    }

    // 2. Extract storage key from the stored URL
    let key: string;
    try {
      key = extractS3KeyFromUrl(attachment.url);
    } catch (extractError) {
      console.error('Error extracting storage key for attachment:', attachmentId, extractError);
      return {
        success: false,
        error: 'Could not process attachment URL',
      } as const;
    }

    // 3. Generate Signed URL using storage provider
    try {
      const signedUrl = await storageProvider.getSignedUrl({
        bucket: BUCKET_NAME!,
        key,
        operation: 'read',
        expiresIn: 3600, // URL expires in 1 hour
      });

      if (!signedUrl) {
        console.error('getSignedUrl returned undefined for key:', key);
        return {
          success: false,
          error: 'Failed to generate signed URL',
        } as const;
      }

      // 4. Return Success
      return { success: true, data: { signedUrl } };
    } catch (storageError) {
      console.error('Storage getSignedUrl Error:', storageError);
      return {
        success: false,
        error: 'Could not generate access URL for the file',
      } as const;
    }
  } catch (dbError) {
    console.error('Database Error fetching attachment:', dbError);
    return {
      success: false,
      error: 'Failed to retrieve attachment details',
    } as const;
  }
};
