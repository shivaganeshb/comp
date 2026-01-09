import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface TeamInfo {
  ok: boolean;
  team: {
    id: string;
    name: string;
    enterprise_id?: string;
  };
}

interface AuditLogsResponse {
  ok: boolean;
  entries?: AuditLogEntry[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface AuditLogEntry {
  id: string;
  date_create: number;
  action: string;
  actor: {
    type: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
  entity: {
    type: string;
    [key: string]: unknown;
  };
  context: {
    location?: {
      type: string;
      id: string;
      name: string;
    };
    ua?: string;
    ip_address?: string;
  };
}

/**
 * Check Slack audit logs configuration and recent activity
 * Maps to: Monitoring & Alerting task
 */
export const auditLogsCheck: IntegrationCheck = {
  id: 'slack-audit-logs',
  name: 'Slack Audit Logs',
  description:
    'Verify that audit logs are available and check for recent security-related events.',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Slack audit logs check');

    // Get team info to check if Enterprise Grid
    const teamInfo = await ctx.fetch<TeamInfo>('team.info');

    if (!teamInfo.ok) {
      ctx.error('Failed to fetch team info');
      return;
    }

    const teamName = teamInfo.team.name;
    const isEnterprise = !!teamInfo.team.enterprise_id;

    // Audit Logs API is only available on Enterprise Grid
    if (!isEnterprise) {
      ctx.fail({
        title: 'Audit logs require Enterprise Grid',
        description: `Slack workspace "${teamName}" is not on Enterprise Grid. Full audit logs are only available with Enterprise Grid plan.`,
        resourceType: 'workspace',
        resourceId: teamInfo.team.id,
        severity: 'low',
        remediation: `To enable comprehensive audit logging:
1. Upgrade to Slack Enterprise Grid
2. Or use Slack's built-in analytics (Business+ plan)
3. Consider integrating with a SIEM that supports Slack's webhook events

For compliance, manually export and review:
- Workspace analytics (Admin → Analytics)
- Access logs (Admin → Settings → Access Logs)`,
        evidence: {
          teamName,
          teamId: teamInfo.team.id,
          plan: 'Not Enterprise Grid',
        },
      });
      return;
    }

    // Try to fetch recent audit logs
    try {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      const logsResponse = await ctx.fetch<AuditLogsResponse>('audit.logs.getSchemas', {
        params: {
          oldest: thirtyDaysAgo.toString(),
          limit: '100',
        },
      });

      if (!logsResponse.ok) {
        if (logsResponse.error === 'missing_scope') {
          ctx.fail({
            title: 'Missing audit logs permission',
            description: 'The integration does not have permission to access audit logs.',
            resourceType: 'workspace',
            resourceId: teamInfo.team.id,
            severity: 'medium',
            remediation: `Add the 'auditlogs:read' scope to the Slack app to enable audit log access.`,
            evidence: {
              error: logsResponse.error,
            },
          });
          return;
        }
        throw new Error(logsResponse.error || 'Unknown error');
      }

      const entries = logsResponse.entries || [];

      // Categorize security events
      const securityActions = [
        'user_login',
        'user_logout',
        'user_session_invalidated',
        'user_created',
        'user_deactivated',
        'role_change_to_admin',
        'role_change_to_owner',
        'app_installed',
        'app_uninstalled',
        'file_downloaded',
        'channel_created',
        'channel_archived',
      ];

      const securityEvents = entries.filter((e) => securityActions.includes(e.action));

      ctx.pass({
        title: 'Audit logs are enabled and accessible',
        description: `Found ${entries.length} audit log entries in the last 30 days, including ${securityEvents.length} security-related events.`,
        resourceType: 'workspace',
        resourceId: teamInfo.team.id,
        evidence: {
          teamName,
          enterpriseId: teamInfo.team.enterprise_id,
          totalEntries: entries.length,
          securityEventCount: securityEvents.length,
          eventTypes: [...new Set(entries.map((e) => e.action))].slice(0, 20),
          sampleEvents: securityEvents.slice(0, 5).map((e) => ({
            action: e.action,
            date: new Date(e.date_create * 1000).toISOString(),
            actor: e.actor.user?.email || e.actor.type,
          })),
        },
      });
    } catch (error) {
      ctx.warn(`Could not access audit logs: ${error}`);

      ctx.fail({
        title: 'Unable to verify audit logs',
        description: `Could not access Slack audit logs API. Error: ${error}`,
        resourceType: 'workspace',
        resourceId: teamInfo.team.id,
        severity: 'medium',
        remediation: `Ensure the integration has proper permissions:
1. Go to api.slack.com/apps
2. Add 'auditlogs:read' scope
3. Reinstall the app to the Enterprise Grid org`,
        evidence: {
          teamName,
          error: String(error),
        },
      });
    }

    ctx.log('Slack audit logs check complete');
  },
};
