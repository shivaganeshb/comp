import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface TeamInfo {
  ok: boolean;
  team: {
    id: string;
    name: string;
    domain: string;
    enterprise_id?: string;
    enterprise_name?: string;
  };
}

interface TeamBillableInfo {
  ok: boolean;
  billable_info: Record<
    string,
    {
      billing_active: boolean;
    }
  >;
}

/**
 * Check if 2FA is enforced for the Slack workspace
 * Maps to: 2FA task
 */
export const twoFactorAuthCheck: IntegrationCheck = {
  id: 'slack-2fa-enforcement',
  name: 'Slack 2FA Enforcement',
  description:
    'Verify that two-factor authentication is required for all users in the Slack workspace.',
  taskMapping: TASK_TEMPLATES.twoFactorAuth,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Slack 2FA enforcement check');

    // Get team info
    const teamInfo = await ctx.fetch<TeamInfo>('team.info');

    if (!teamInfo.ok) {
      ctx.error('Failed to fetch team info from Slack');
      return;
    }

    const teamName = teamInfo.team.name;
    const teamId = teamInfo.team.id;
    const isEnterprise = !!teamInfo.team.enterprise_id;

    ctx.log(`Checking 2FA for workspace: ${teamName} (${teamId})`);

    // For Enterprise Grid, check admin settings
    if (isEnterprise) {
      try {
        // Enterprise Grid has org-level 2FA settings
        const adminInfo = await ctx.fetch<{
          ok: boolean;
          team?: { two_factor_required?: boolean };
        }>('admin.teams.settings.info', {
          params: { team_id: teamId },
        });

        if (adminInfo.ok && adminInfo.team?.two_factor_required) {
          ctx.pass({
            title: '2FA is enforced at organization level',
            description: `Two-factor authentication is required for all users in ${teamName} via Enterprise Grid settings.`,
            resourceType: 'workspace',
            resourceId: teamId,
            evidence: {
              teamName,
              teamId,
              enterpriseId: teamInfo.team.enterprise_id,
              twoFactorRequired: true,
            },
          });
          return;
        }
      } catch (error) {
        ctx.log(`Enterprise admin API not available: ${error}`);
      }
    }

    // For Business+ and below, check via team preferences or provide guidance
    // Note: Slack's API doesn't expose 2FA settings directly for non-Enterprise
    // We can only verify the workspace exists and recommend manual verification

    ctx.fail({
      title: '2FA enforcement cannot be verified via API',
      description: `Unable to programmatically verify 2FA enforcement for ${teamName}. Please verify manually in Slack Admin settings.`,
      resourceType: 'workspace',
      resourceId: teamId,
      severity: 'medium',
      remediation: `To enable 2FA enforcement:
1. Go to Slack Admin → Settings → Authentication
2. Enable "Require two-factor authentication for your workspace"
3. Choose enforcement timeline for existing users

For Enterprise Grid:
1. Go to Organization Admin → Security → Sign-in
2. Enable "Require two-factor authentication"`,
      evidence: {
        teamName,
        teamId,
        isEnterprise,
        note: 'Manual verification required - Slack API does not expose 2FA settings for non-Enterprise workspaces',
      },
    });

    ctx.log('Slack 2FA check complete');
  },
};
