'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, storageProvider } from '@/app/s3';
import { db } from '@db';
import { z } from 'zod';

export const getPolicyPdfUrlAction = authActionClient
  .inputSchema(z.object({ policyId: z.string() }))
  .metadata({
    name: 'get-policy-pdf-url',
    track: {
      event: 'get-policy-pdf-url-storage',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    if (!storageProvider || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId },
        select: { pdfUrl: true },
      });

      if (!policy?.pdfUrl) {
        return { success: false, error: 'No PDF found for this policy.' };
      }

      // Generate a temporary, secure URL for the client to render the PDF from the private bucket.
      const signedUrl = await storageProvider.getSignedUrl({
        bucket: BUCKET_NAME,
        key: policy.pdfUrl,
        operation: 'read',
        expiresIn: 900, // URL is valid for 15 minutes
        contentDisposition: 'inline',
      });

      return { success: true, data: signedUrl };
    } catch (error) {
      console.error('Error generating signed URL for policy PDF:', error);
      return { success: false, error: 'Could not retrieve PDF.' };
    }
  });
