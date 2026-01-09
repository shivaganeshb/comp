import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type { GCPServiceAccount } from '../types';

interface ServiceAccountKey {
  name: string;
  validAfterTime: string;
  validBeforeTime: string;
  keyAlgorithm: string;
  keyOrigin: string;
  keyType: 'USER_MANAGED' | 'SYSTEM_MANAGED';
}

interface ServiceAccountKeysResponse {
  keys: ServiceAccountKey[];
}

// 90 days in milliseconds - keys older than this should be rotated
const KEY_ROTATION_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Check service account keys for rotation compliance
 * Maps to: Access Review Log task
 */
export const serviceAccountKeysCheck: IntegrationCheck = {
  id: 'gcp-service-account-keys',
  name: 'Service Account Key Rotation',
  description:
    'Verify service account keys are rotated regularly (within 90 days). Long-lived keys pose a security risk if compromised.',
  taskMapping: TASK_TEMPLATES.accessReviewLog,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Service Account Key Rotation check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for service account key check');
      return;
    }

    ctx.log(`Checking service accounts for project: ${projectId}`);

    // List all service accounts
    let pageToken: string | undefined;
    const allServiceAccounts: GCPServiceAccount[] = [];

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<{ accounts?: GCPServiceAccount[]; nextPageToken?: string }>(
        `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`,
        { params },
      );

      if (response.accounts) {
        allServiceAccounts.push(...response.accounts);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allServiceAccounts.length} service accounts`);

    const now = new Date();
    let totalKeysChecked = 0;
    let expiredKeys = 0;

    for (const sa of allServiceAccounts) {
      if (sa.disabled) {
        ctx.log(`Skipping disabled service account: ${sa.email}`);
        continue;
      }

      // List keys for this service account
      try {
        const keysResponse = await ctx.fetch<ServiceAccountKeysResponse>(
          `https://iam.googleapis.com/v1/${sa.name}/keys`,
        );

        const userManagedKeys = (keysResponse.keys || []).filter(
          (key) => key.keyType === 'USER_MANAGED',
        );

        if (userManagedKeys.length === 0) {
          // No user-managed keys - this is actually good (using workload identity or other auth)
          ctx.pass({
            title: `No user-managed keys for ${sa.email}`,
            description:
              'This service account has no user-managed keys, which is the recommended approach. Use Workload Identity or short-lived tokens instead.',
            resourceType: 'service-account',
            resourceId: sa.email,
            evidence: {
              serviceAccountEmail: sa.email,
              userManagedKeyCount: 0,
            },
          });
          continue;
        }

        totalKeysChecked += userManagedKeys.length;

        for (const key of userManagedKeys) {
          const keyCreatedAt = new Date(key.validAfterTime);
          const keyAgeMs = now.getTime() - keyCreatedAt.getTime();
          const keyAgeDays = Math.floor(keyAgeMs / (24 * 60 * 60 * 1000));

          // Extract key ID from the full name
          const keyId = key.name.split('/').pop() || key.name;

          if (keyAgeMs > KEY_ROTATION_THRESHOLD_MS) {
            expiredKeys++;
            ctx.fail({
              title: `Service account key older than 90 days`,
              description: `Service account ${sa.email} has a key that is ${keyAgeDays} days old. Keys should be rotated every 90 days.`,
              resourceType: 'service-account-key',
              resourceId: `${sa.email}/${keyId}`,
              severity: 'high',
              remediation: `1. Create a new key for service account ${sa.email}
2. Update any applications using the old key
3. Delete the old key (ID: ${keyId})
4. Consider using Workload Identity instead of long-lived keys

Command to create new key:
gcloud iam service-accounts keys create key.json --iam-account=${sa.email}`,
              evidence: {
                serviceAccountEmail: sa.email,
                keyId,
                createdAt: key.validAfterTime,
                ageDays: keyAgeDays,
                keyAlgorithm: key.keyAlgorithm,
              },
            });
          } else {
            ctx.pass({
              title: `Service account key within rotation policy`,
              description: `Key for ${sa.email} is ${keyAgeDays} days old (within 90-day policy).`,
              resourceType: 'service-account-key',
              resourceId: `${sa.email}/${keyId}`,
              evidence: {
                serviceAccountEmail: sa.email,
                keyId,
                createdAt: key.validAfterTime,
                ageDays: keyAgeDays,
              },
            });
          }
        }
      } catch (error) {
        ctx.warn(`Could not fetch keys for ${sa.email}: ${error}`);
      }
    }

    // Summary
    if (expiredKeys === 0 && totalKeysChecked > 0) {
      ctx.log(`All ${totalKeysChecked} service account keys are within rotation policy`);
    } else if (totalKeysChecked === 0) {
      ctx.pass({
        title: 'No user-managed service account keys found',
        description:
          'The project has no user-managed service account keys, which is the recommended security posture.',
        resourceType: 'project',
        resourceId: projectId,
        evidence: {
          projectId,
          serviceAccountCount: allServiceAccounts.length,
        },
      });
    }

    ctx.log('GCP Service Account Key Rotation check complete');
  },
};
