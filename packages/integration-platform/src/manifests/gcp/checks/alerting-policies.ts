import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface AlertingPolicy {
  name: string;
  displayName: string;
  enabled: boolean;
  conditions: Array<{
    displayName: string;
    conditionThreshold?: {
      filter: string;
      comparison: string;
      thresholdValue?: number;
    };
    conditionAbsent?: {
      filter: string;
    };
    conditionMatchedLog?: {
      filter: string;
    };
  }>;
  notificationChannels?: string[];
  alertStrategy?: {
    notificationRateLimit?: {
      period: string;
    };
  };
}

interface AlertingPoliciesResponse {
  alertPolicies?: AlertingPolicy[];
  nextPageToken?: string;
}

interface NotificationChannel {
  name: string;
  type: string;
  displayName: string;
  enabled: boolean;
  labels?: Record<string, string>;
}

interface NotificationChannelsResponse {
  notificationChannels?: NotificationChannel[];
  nextPageToken?: string;
}

/**
 * Check Cloud Monitoring alerting policies
 * Maps to: Monitoring & Alerting task
 */
export const alertingPoliciesCheck: IntegrationCheck = {
  id: 'gcp-alerting-policies',
  name: 'Cloud Monitoring Alerting Policies',
  description:
    'Verify alerting policies are configured for critical infrastructure metrics and that notification channels are properly set up.',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Alerting Policies check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for alerting policies check');
      return;
    }

    ctx.log(`Checking alerting policies for project: ${projectId}`);

    // Fetch all alerting policies
    const allPolicies: AlertingPolicy[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<AlertingPoliciesResponse>(
        `https://monitoring.googleapis.com/v3/projects/${projectId}/alertPolicies`,
        { params },
      );

      if (response.alertPolicies) {
        allPolicies.push(...response.alertPolicies);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allPolicies.length} alerting policies`);

    // Fetch notification channels
    const allChannels: NotificationChannel[] = [];
    pageToken = undefined;

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<NotificationChannelsResponse>(
        `https://monitoring.googleapis.com/v3/projects/${projectId}/notificationChannels`,
        { params },
      );

      if (response.notificationChannels) {
        allChannels.push(...response.notificationChannels);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allChannels.length} notification channels`);

    // Check if we have any alerting policies
    if (allPolicies.length === 0) {
      ctx.fail({
        title: 'No alerting policies configured',
        description:
          'The project has no Cloud Monitoring alerting policies. Alerting is essential for detecting and responding to infrastructure issues.',
        resourceType: 'project',
        resourceId: projectId,
        severity: 'high',
        remediation: `Configure alerting policies in Cloud Monitoring:
1. Go to Monitoring > Alerting in Cloud Console
2. Click "Create Policy"
3. Add conditions for critical metrics (CPU, memory, errors)
4. Configure notification channels (email, Slack, PagerDuty)
5. Consider using recommended alerts from the library`,
        evidence: {
          projectId,
          policyCount: 0,
        },
      });
      return;
    }

    // Check notification channels exist
    if (allChannels.length === 0) {
      ctx.fail({
        title: 'No notification channels configured',
        description:
          'The project has alerting policies but no notification channels. Alerts will not be delivered to anyone.',
        resourceType: 'project',
        resourceId: projectId,
        severity: 'high',
        remediation: `Configure notification channels:
1. Go to Monitoring > Alerting > Edit Notification Channels
2. Add channels for your team (email, Slack, PagerDuty, etc.)
3. Update alerting policies to use these channels`,
        evidence: {
          projectId,
          policyCount: allPolicies.length,
          channelCount: 0,
        },
      });
    }

    const enabledChannels = allChannels.filter((c) => c.enabled);
    if (enabledChannels.length < allChannels.length) {
      ctx.warn(
        `${allChannels.length - enabledChannels.length} notification channels are disabled`,
      );
    }

    // Check each alerting policy
    let policiesWithChannels = 0;
    let disabledPolicies = 0;

    for (const policy of allPolicies) {
      const policyId = policy.name.split('/').pop() || policy.name;

      if (!policy.enabled) {
        disabledPolicies++;
        ctx.fail({
          title: `Alerting policy is disabled: ${policy.displayName}`,
          description: `The alerting policy "${policy.displayName}" is disabled and will not trigger alerts.`,
          resourceType: 'alerting-policy',
          resourceId: policyId,
          severity: 'medium',
          remediation: `Enable the alerting policy:
1. Go to Monitoring > Alerting
2. Find policy "${policy.displayName}"
3. Click Edit and enable the policy
4. Or delete if no longer needed`,
          evidence: {
            policyId,
            displayName: policy.displayName,
            enabled: false,
          },
        });
        continue;
      }

      if (!policy.notificationChannels || policy.notificationChannels.length === 0) {
        ctx.fail({
          title: `No notification channels for: ${policy.displayName}`,
          description: `The alerting policy "${policy.displayName}" has no notification channels. Alerts will be logged but not delivered.`,
          resourceType: 'alerting-policy',
          resourceId: policyId,
          severity: 'medium',
          remediation: `Add notification channels to the policy:
1. Go to Monitoring > Alerting
2. Edit policy "${policy.displayName}"
3. Add notification channels in the "Notifications" section`,
          evidence: {
            policyId,
            displayName: policy.displayName,
            conditions: policy.conditions?.length || 0,
          },
        });
      } else {
        policiesWithChannels++;
        ctx.pass({
          title: `Alerting policy configured: ${policy.displayName}`,
          description: `Policy "${policy.displayName}" is enabled with ${policy.notificationChannels.length} notification channel(s).`,
          resourceType: 'alerting-policy',
          resourceId: policyId,
          evidence: {
            policyId,
            displayName: policy.displayName,
            enabled: policy.enabled,
            conditionCount: policy.conditions?.length || 0,
            notificationChannelCount: policy.notificationChannels.length,
          },
        });
      }
    }

    // Overall summary
    if (policiesWithChannels > 0 && disabledPolicies === 0) {
      ctx.pass({
        title: 'Alerting infrastructure is properly configured',
        description: `Project has ${allPolicies.length} alerting policies and ${enabledChannels.length} active notification channels.`,
        resourceType: 'project',
        resourceId: projectId,
        evidence: {
          projectId,
          totalPolicies: allPolicies.length,
          enabledPolicies: allPolicies.length - disabledPolicies,
          policiesWithChannels,
          totalChannels: allChannels.length,
          enabledChannels: enabledChannels.length,
        },
      });
    }

    ctx.log('GCP Alerting Policies check complete');
  },
};
