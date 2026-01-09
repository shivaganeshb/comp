'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, storageProvider } from '@/app/s3';
import { db, PolicyDisplayFormat } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const uploadPolicyPdfSchema = z.object({
  policyId: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // Base64 encoded file content
});

export const uploadPolicyPdfAction = authActionClient
  .inputSchema(uploadPolicyPdfSchema)
  .metadata({
    name: 'upload-policy-pdf',
    track: {
      event: 'upload-policy-pdf-storage',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, fileName, fileType, fileData } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    if (!storageProvider || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${organizationId}/policies/${policyId}/${Date.now()}-${sanitizedFileName}`;

    try {
      const fileBuffer = Buffer.from(fileData, 'base64');

      await storageProvider.upload({
        bucket: BUCKET_NAME,
        key: storageKey,
        data: fileBuffer,
        contentType: fileType,
      });

      // After a successful upload, update the policy to store the storage key
      await db.policy.update({
        where: { id: policyId, organizationId },
        data: {
          pdfUrl: storageKey,
          displayFormat: PolicyDisplayFormat.PDF,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return { success: true, data: { s3Key: storageKey } };
    } catch (error) {
      console.error('Error uploading policy PDF to storage:', error);
      return { success: false, error: 'Failed to upload PDF.' };
    }
  });
