import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface AuditConfig {
  service: string;
  auditLogConfigs: Array<{
    logType: 'ADMIN_READ' | 'DATA_READ' | 'DATA_WRITE';
    exemptedMembers?: string[];
  }>;
}

interface IAMAuditConfigPolicy {
  auditConfigs?: AuditConfig[];
  bindings?: Array<{ role: string; members: string[] }>;
}

// Services that should have audit logging enabled for SOC2
const CRITICAL_SERVICES = [
  'allServices', // Global audit config
  'cloudresourcemanager.googleapis.com',
  'iam.googleapis.com',
  'compute.googleapis.com',
  'storage.googleapis.com',
  'bigquery.googleapis.com',
  'cloudsql.googleapis.com',
  'container.googleapis.com',
];

/**
 * Check Cloud Audit Logs configuration
 * Maps to: Monitoring & Alerting task
 */
export const auditLogsCheck: IntegrationCheck = {
  id: 'gcp-audit-logs',
  name: 'Cloud Audit Logs Configuration',
  description:
    'Verify Cloud Audit Logs are enabled for critical services. Admin Activity logs are always enabled, but Data Access logs must be explicitly configured.',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Cloud Audit Logs check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for audit logs check');
      return;
    }

    ctx.log(`Checking audit log configuration for project: ${projectId}`);

    // Get IAM policy with audit configs
    const policy = await ctx.post<IAMAuditConfigPolicy>(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`,
      { options: { requestedPolicyVersion: 3 } },
    );

    const auditConfigs = policy.auditConfigs || [];
    ctx.log(`Found ${auditConfigs.length} audit configurations`);

    // Check if allServices has audit logging
    const allServicesConfig = auditConfigs.find((c) => c.service === 'allServices');

    if (allServicesConfig) {
      const hasAdminRead = allServicesConfig.auditLogConfigs.some(
        (c) => c.logType === 'ADMIN_READ',
      );
      const hasDataRead = allServicesConfig.auditLogConfigs.some((c) => c.logType === 'DATA_READ');
      const hasDataWrite = allServicesConfig.auditLogConfigs.some(
        (c) => c.logType === 'DATA_WRITE',
      );

      if (hasAdminRead && hasDataRead && hasDataWrite) {
        ctx.pass({
          title: 'Comprehensive audit logging enabled for all services',
          description:
            'The project has audit logging enabled for ADMIN_READ, DATA_READ, and DATA_WRITE operations across all services.',
          resourceType: 'audit-config',
          resourceId: `${projectId}/allServices`,
          evidence: {
            projectId,
            service: 'allServices',
            logTypes: allServicesConfig.auditLogConfigs.map((c) => c.logType),
            exemptions: allServicesConfig.auditLogConfigs
              .filter((c) => c.exemptedMembers?.length)
              .map((c) => ({
                logType: c.logType,
                exemptedMembers: c.exemptedMembers,
              })),
          },
        });
      } else {
        const missingTypes = [];
        if (!hasAdminRead) missingTypes.push('ADMIN_READ');
        if (!hasDataRead) missingTypes.push('DATA_READ');
        if (!hasDataWrite) missingTypes.push('DATA_WRITE');

        ctx.fail({
          title: 'Incomplete audit logging for all services',
          description: `Audit logging for allServices is missing: ${missingTypes.join(', ')}. This may leave gaps in your audit trail.`,
          resourceType: 'audit-config',
          resourceId: `${projectId}/allServices`,
          severity: 'medium',
          remediation: `Enable the missing audit log types:
1. Go to IAM & Admin > Audit Logs in Cloud Console
2. Find "Default audit config" or "allServices"
3. Enable: ${missingTypes.join(', ')}
4. Or use gcloud:
   gcloud projects get-iam-policy ${projectId} > policy.yaml
   # Edit policy.yaml to add missing auditLogConfigs
   gcloud projects set-iam-policy ${projectId} policy.yaml`,
          evidence: {
            projectId,
            service: 'allServices',
            enabledLogTypes: allServicesConfig.auditLogConfigs.map((c) => c.logType),
            missingLogTypes: missingTypes,
          },
        });
      }
    } else {
      // No allServices config - check individual critical services
      ctx.fail({
        title: 'No default audit logging configuration',
        description:
          'The project does not have a default audit logging configuration for all services. Individual service configurations may be missing.',
        resourceType: 'audit-config',
        resourceId: `${projectId}/allServices`,
        severity: 'high',
        remediation: `Enable default audit logging:
1. Go to IAM & Admin > Audit Logs in Cloud Console
2. Set up a default config for "allServices" with ADMIN_READ, DATA_READ, and DATA_WRITE
3. Or use the API/gcloud to set auditConfigs on the project IAM policy`,
        evidence: {
          projectId,
          configuredServices: auditConfigs.map((c) => c.service),
        },
      });
    }

    // Check specific critical services
    for (const service of CRITICAL_SERVICES) {
      if (service === 'allServices') continue; // Already checked

      const serviceConfig = auditConfigs.find((c) => c.service === service);

      if (serviceConfig) {
        ctx.pass({
          title: `Audit logging configured for ${service}`,
          description: `Service ${service} has explicit audit log configuration.`,
          resourceType: 'audit-config',
          resourceId: `${projectId}/${service}`,
          evidence: {
            projectId,
            service,
            logTypes: serviceConfig.auditLogConfigs.map((c) => c.logType),
          },
        });
      }
      // Note: If allServices is configured, individual services inherit that config
    }

    ctx.log('GCP Cloud Audit Logs check complete');
  },
};
