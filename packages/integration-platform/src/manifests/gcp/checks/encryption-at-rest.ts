import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface Disk {
  name: string;
  selfLink: string;
  zone: string;
  status: string;
  diskEncryptionKey?: {
    sha256?: string;
    kmsKeyName?: string;
  };
  sourceDisk?: string;
  sourceImage?: string;
}

interface DisksResponse {
  items?: Disk[];
  nextPageToken?: string;
}

interface Bucket {
  name: string;
  location: string;
  storageClass: string;
  encryption?: {
    defaultKmsKeyName?: string;
  };
  iamConfiguration?: {
    uniformBucketLevelAccess?: {
      enabled: boolean;
    };
  };
}

interface BucketsResponse {
  items?: Bucket[];
  nextPageToken?: string;
}

interface SQLInstance {
  name: string;
  state: string;
  databaseVersion: string;
  settings?: {
    backupConfiguration?: {
      enabled: boolean;
      binaryLogEnabled?: boolean;
    };
    ipConfiguration?: {
      requireSsl?: boolean;
    };
    dataDiskType?: string;
  };
  diskEncryptionConfiguration?: {
    kmsKeyName?: string;
  };
  diskEncryptionStatus?: {
    kmsKeyVersionName?: string;
  };
}

interface SQLInstancesResponse {
  items?: SQLInstance[];
  nextPageToken?: string;
}

/**
 * Check encryption at rest configuration
 * Maps to: Encryption at Rest task
 */
export const encryptionAtRestCheck: IntegrationCheck = {
  id: 'gcp-encryption-at-rest',
  name: 'Encryption at Rest',
  description:
    'Verify all data stores (Cloud Storage, Compute disks, Cloud SQL) have encryption at rest enabled. GCP encrypts by default, but customer-managed keys (CMEK) provide additional control.',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Encryption at Rest check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for encryption check');
      return;
    }

    ctx.log(`Checking encryption for project: ${projectId}`);

    // Check Cloud Storage buckets
    await checkStorageBuckets(ctx, projectId);

    // Check Compute Engine disks
    await checkComputeDisks(ctx, projectId);

    // Check Cloud SQL instances
    await checkCloudSQL(ctx, projectId);

    ctx.log('GCP Encryption at Rest check complete');
  },
};

async function checkStorageBuckets(ctx: CheckContext, projectId: string): Promise<void> {
  ctx.log('Checking Cloud Storage buckets...');

  try {
    const allBuckets: Bucket[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        project: projectId,
        maxResults: '100',
      };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<BucketsResponse>(
        'https://storage.googleapis.com/storage/v1/b',
        { params },
      );

      if (response.items) {
        allBuckets.push(...response.items);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allBuckets.length} storage buckets`);

    for (const bucket of allBuckets) {
      // All GCS buckets are encrypted by default with Google-managed keys
      // CMEK provides additional control
      const hasCMEK = !!bucket.encryption?.defaultKmsKeyName;

      if (hasCMEK) {
        ctx.pass({
          title: `Bucket ${bucket.name} uses Customer-Managed Encryption Key`,
          description: `Storage bucket is encrypted with a customer-managed key from Cloud KMS, providing enhanced control over encryption.`,
          resourceType: 'storage-bucket',
          resourceId: bucket.name,
          evidence: {
            bucketName: bucket.name,
            location: bucket.location,
            storageClass: bucket.storageClass,
            encryptionType: 'CMEK',
            kmsKeyName: bucket.encryption?.defaultKmsKeyName,
            uniformBucketLevelAccess: bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled,
          },
        });
      } else {
        // Google-managed encryption is still compliant, but CMEK is preferred for SOC2
        ctx.pass({
          title: `Bucket ${bucket.name} encrypted with Google-managed key`,
          description: `Storage bucket is encrypted with Google-managed encryption keys. Consider using CMEK for enhanced control.`,
          resourceType: 'storage-bucket',
          resourceId: bucket.name,
          evidence: {
            bucketName: bucket.name,
            location: bucket.location,
            storageClass: bucket.storageClass,
            encryptionType: 'Google-managed',
            uniformBucketLevelAccess: bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled,
          },
        });
      }
    }

    if (allBuckets.length === 0) {
      ctx.log('No Cloud Storage buckets found in project');
    }
  } catch (error) {
    ctx.warn(`Could not check Cloud Storage buckets: ${error}`);
  }
}

async function checkComputeDisks(ctx: CheckContext, projectId: string): Promise<void> {
  ctx.log('Checking Compute Engine disks...');

  try {
    // List all disks across all zones (aggregated)
    const allDisks: Disk[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        maxResults: '100',
      };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<{ items?: Record<string, { disks?: Disk[] }>; nextPageToken?: string }>(
        `https://compute.googleapis.com/compute/v1/projects/${projectId}/aggregated/disks`,
        { params },
      );

      if (response.items) {
        for (const zone of Object.values(response.items)) {
          if (zone.disks) {
            allDisks.push(...zone.disks);
          }
        }
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allDisks.length} Compute Engine disks`);

    for (const disk of allDisks) {
      // Extract zone name from selfLink or zone field
      const zoneName = disk.zone?.split('/').pop() || 'unknown';
      const hasCMEK = !!disk.diskEncryptionKey?.kmsKeyName;

      if (hasCMEK) {
        ctx.pass({
          title: `Disk ${disk.name} uses Customer-Managed Encryption Key`,
          description: `Compute disk is encrypted with a customer-managed key from Cloud KMS.`,
          resourceType: 'compute-disk',
          resourceId: `${zoneName}/${disk.name}`,
          evidence: {
            diskName: disk.name,
            zone: zoneName,
            status: disk.status,
            encryptionType: 'CMEK',
            kmsKeyName: disk.diskEncryptionKey?.kmsKeyName,
          },
        });
      } else {
        // All Compute disks are encrypted by default with Google-managed keys
        ctx.pass({
          title: `Disk ${disk.name} encrypted with Google-managed key`,
          description: `Compute disk is encrypted with Google-managed encryption. Consider CMEK for enhanced control.`,
          resourceType: 'compute-disk',
          resourceId: `${zoneName}/${disk.name}`,
          evidence: {
            diskName: disk.name,
            zone: zoneName,
            status: disk.status,
            encryptionType: 'Google-managed',
          },
        });
      }
    }

    if (allDisks.length === 0) {
      ctx.log('No Compute Engine disks found in project');
    }
  } catch (error) {
    ctx.warn(`Could not check Compute Engine disks: ${error}`);
  }
}

async function checkCloudSQL(ctx: CheckContext, projectId: string): Promise<void> {
  ctx.log('Checking Cloud SQL instances...');

  try {
    const response = await ctx.fetch<SQLInstancesResponse>(
      `https://sqladmin.googleapis.com/sql/v1beta4/projects/${projectId}/instances`,
    );

    const instances = response.items || [];
    ctx.log(`Found ${instances.length} Cloud SQL instances`);

    for (const instance of instances) {
      const hasCMEK = !!instance.diskEncryptionConfiguration?.kmsKeyName;
      const hasSSL = instance.settings?.ipConfiguration?.requireSsl;
      const hasBackup = instance.settings?.backupConfiguration?.enabled;

      if (hasCMEK) {
        ctx.pass({
          title: `Cloud SQL ${instance.name} uses Customer-Managed Encryption Key`,
          description: `Cloud SQL instance is encrypted with a customer-managed key from Cloud KMS.`,
          resourceType: 'cloudsql-instance',
          resourceId: instance.name,
          evidence: {
            instanceName: instance.name,
            databaseVersion: instance.databaseVersion,
            state: instance.state,
            encryptionType: 'CMEK',
            kmsKeyName: instance.diskEncryptionConfiguration?.kmsKeyName,
            requireSsl: hasSSL,
            backupEnabled: hasBackup,
          },
        });
      } else {
        // Cloud SQL is encrypted by default with Google-managed keys
        ctx.pass({
          title: `Cloud SQL ${instance.name} encrypted with Google-managed key`,
          description: `Cloud SQL instance is encrypted with Google-managed encryption. Consider CMEK for enhanced control.`,
          resourceType: 'cloudsql-instance',
          resourceId: instance.name,
          evidence: {
            instanceName: instance.name,
            databaseVersion: instance.databaseVersion,
            state: instance.state,
            encryptionType: 'Google-managed',
            requireSsl: hasSSL,
            backupEnabled: hasBackup,
          },
        });
      }

      // Additional check for SSL requirement
      if (!hasSSL) {
        ctx.fail({
          title: `Cloud SQL ${instance.name} does not require SSL`,
          description: `Connections to Cloud SQL instance do not require SSL/TLS encryption.`,
          resourceType: 'cloudsql-instance',
          resourceId: instance.name,
          severity: 'high',
          remediation: `Enable SSL requirement:
1. Go to Cloud SQL in Cloud Console
2. Select instance "${instance.name}"
3. Go to Connections tab
4. Enable "Require SSL"`,
          evidence: {
            instanceName: instance.name,
            requireSsl: false,
          },
        });
      }

      // Additional check for backups
      if (!hasBackup) {
        ctx.fail({
          title: `Cloud SQL ${instance.name} has backups disabled`,
          description: `Automated backups are not enabled for this Cloud SQL instance.`,
          resourceType: 'cloudsql-instance',
          resourceId: instance.name,
          severity: 'high',
          remediation: `Enable automated backups:
1. Go to Cloud SQL in Cloud Console
2. Select instance "${instance.name}"
3. Go to Backups tab
4. Enable automated backups`,
          evidence: {
            instanceName: instance.name,
            backupEnabled: false,
          },
        });
      }
    }

    if (instances.length === 0) {
      ctx.log('No Cloud SQL instances found in project');
    }
  } catch (error) {
    ctx.warn(`Could not check Cloud SQL instances: ${error}`);
  }
}
