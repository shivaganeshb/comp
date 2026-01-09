import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface TeamInfo {
  ok: boolean;
  team: {
    id: string;
    name: string;
    domain: string;
    enterprise_id?: string;
  };
}

/**
 * Check Slack data retention and backup policies
 * Maps to: Backup logs task
 */
export const dataRetentionCheck: IntegrationCheck = {
  id: 'slack-data-retention',
  name: 'Slack Data Retention Policy',
  description:
    'Verify data retention policies are configured for compliance with backup and log retention requirements.',
  taskMapping: TASK_TEMPLATES.backupLogs,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Slack data retention check');

    // Get team info
    const teamInfo = await ctx.fetch<TeamInfo>('team.info');

    if (!teamInfo.ok) {
      ctx.error('Failed to fetch team info');
      return;
    }

    const teamName = teamInfo.team.name;
    const teamId = teamInfo.team.id;
    const isEnterprise = !!teamInfo.team.enterprise_id;

    // Note: Slack's data retention settings are not directly accessible via API
    // We can only provide guidance based on plan type

    if (isEnterprise) {
      // Enterprise Grid has more retention controls
      ctx.pass({
        title: 'Enterprise Grid data retention available',
        description: `${teamName} is on Enterprise Grid, which provides comprehensive data retention controls including custom retention policies, eDiscovery, and data export.`,
        resourceType: 'workspace',
        resourceId: teamId,
        evidence: {
          teamName,
          teamId,
          enterpriseId: teamInfo.team.enterprise_id,
          planType: 'Enterprise Grid',
          capabilities: [
            'Custom message retention policies',
            'File retention controls',
            'eDiscovery and legal holds',
            'Corporate export API',
            'Audit logs with 1-year retention',
          ],
        },
      });

      // Provide guidance on verifying retention settings
      ctx.log('Recommend manual verification of retention policies in Slack Admin');
    } else {
      // Business+ or below has limited retention controls
      ctx.fail({
        title: 'Limited data retention controls',
        description: `${teamName} has limited data retention options. Custom retention policies require Enterprise Grid.`,
        resourceType: 'workspace',
        resourceId: teamId,
        severity: 'low',
        remediation: `To improve data retention compliance:

**Current Plan Options:**
1. Use Slack's default retention (messages kept indefinitely)
2. Export workspace data periodically via Admin → Settings → Import/Export
3. Set up third-party backup tools (e.g., Aware, Hanzo)

**For Full Compliance:**
Upgrade to Enterprise Grid for:
- Custom retention policies per channel
- Automated data export
- eDiscovery and legal holds
- Extended audit log retention

**Manual Backup Procedure:**
1. Go to Admin → Settings → Import/Export Data
2. Request an export (available for workspace owners)
3. Store exports securely with proper retention labels`,
        evidence: {
          teamName,
          teamId,
          planType: 'Business+ or below',
          limitations: [
            'No custom retention policies',
            'Manual export only',
            'Limited audit log history',
          ],
        },
      });
    }

    ctx.log('Slack data retention check complete');
  },
};
