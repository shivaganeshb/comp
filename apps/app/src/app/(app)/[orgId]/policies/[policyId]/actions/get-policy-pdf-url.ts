'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, storageProvider } from '@/app/s3';
import { db } from '@db';
import { z } from 'zod';

export const getPolicyPdfUrlAction = authActionClient
  .inputSchema(z.object({ 
    policyId: z.string(),
    versionId: z.string().optional(), // If provided, get URL for this version's PDF
  }))
  .metadata({
    name: 'get-policy-pdf-url',
    track: {
      event: 'get-policy-pdf-url-storage',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    if (!storageProvider || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    try {
      let pdfUrl: string | null = null;

      if (versionId) {
        // Get PDF URL from specific version
        // IMPORTANT: Include organizationId check to prevent cross-org access
        const version = await db.policyVersion.findUnique({
          where: { id: versionId },
          select: {
            pdfUrl: true,
            policyId: true,
            policy: {
              select: { organizationId: true },
            },
          },
        });

        if (
          !version ||
          version.policyId !== policyId ||
          version.policy.organizationId !== organizationId
        ) {
          return { success: false, error: 'Version not found' };
        }

        pdfUrl = version.pdfUrl;
      } else {
        // Legacy: get from policy level
        const policy = await db.policy.findUnique({
          where: { id: policyId, organizationId },
          select: {
            pdfUrl: true,
            currentVersion: {
              select: { pdfUrl: true },
            },
          },
        });

        pdfUrl = policy?.currentVersion?.pdfUrl ?? policy?.pdfUrl ?? null;
      }

      if (!pdfUrl) {
        return { success: false, error: 'No PDF found.' };
      }

      // Generate a temporary, secure URL for the client to render the PDF from the private bucket.
<<<<<<< HEAD
      const signedUrl = await storageProvider.getSignedUrl({
        bucket: BUCKET_NAME,
        key: policy.pdfUrl,
        operation: 'read',
        expiresIn: 900, // URL is valid for 15 minutes
        contentDisposition: 'inline',
=======
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfUrl,
        ResponseContentDisposition: 'inline',
        ResponseContentType: 'application/pdf',
>>>>>>> upstream/main
      });

      return { success: true, data: signedUrl };
    } catch (error) {
      console.error('Error generating signed URL for policy PDF:', error);
      return { success: false, error: 'Could not retrieve PDF.' };
    }
  });
