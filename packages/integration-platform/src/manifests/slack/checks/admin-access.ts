import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface UsersListResponse {
  ok: boolean;
  members: SlackUser[];
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  deleted: boolean;
  profile?: {
    email?: string;
    display_name?: string;
  };
}

/**
 * Check admin access in Slack workspace
 * Maps to: Role-based Access Controls task
 */
export const adminAccessCheck: IntegrationCheck = {
  id: 'slack-admin-access',
  name: 'Slack Admin Access Review',
  description:
    'Review users with admin or owner privileges in Slack to ensure least-privilege access.',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Slack admin access check');

    // Fetch all users with pagination
    const allUsers: SlackUser[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: '200' };
      if (cursor) params.cursor = cursor;

      const response = await ctx.fetch<UsersListResponse>('users.list', { params });

      if (!response.ok) {
        ctx.error('Failed to fetch users from Slack');
        return;
      }

      allUsers.push(...response.members);
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    ctx.log(`Found ${allUsers.length} total users`);

    // Filter to active, non-bot users
    const activeUsers = allUsers.filter((u) => !u.deleted && !u.is_bot);

    // Categorize by access level
    const owners = activeUsers.filter((u) => u.is_owner || u.is_primary_owner);
    const admins = activeUsers.filter((u) => u.is_admin && !u.is_owner);
    const regularUsers = activeUsers.filter((u) => !u.is_admin && !u.is_owner);

    ctx.log(`Owners: ${owners.length}, Admins: ${admins.length}, Regular: ${regularUsers.length}`);

    // Check for excessive admin count (more than 10% of users or more than 5 admins)
    const totalAdminCount = owners.length + admins.length;
    const adminPercentage = (totalAdminCount / activeUsers.length) * 100;

    if (totalAdminCount > 5 || adminPercentage > 10) {
      ctx.fail({
        title: 'Excessive admin access in Slack',
        description: `${totalAdminCount} users (${adminPercentage.toFixed(1)}%) have admin or owner access. Consider reducing to follow least-privilege principle.`,
        resourceType: 'workspace',
        resourceId: 'slack-admins',
        severity: 'medium',
        remediation: `Review and reduce admin access:
1. Go to Slack Admin → Manage Members
2. Review each admin's need for elevated access
3. Demote users who don't require admin privileges
4. Consider using Slack's role-based permissions instead of full admin

Current admins/owners:
${[...owners, ...admins]
  .map((u) => `- ${u.real_name || u.name} (${u.profile?.email || 'no email'})`)
  .join('\n')}`,
        evidence: {
          totalUsers: activeUsers.length,
          ownerCount: owners.length,
          adminCount: admins.length,
          adminPercentage: adminPercentage.toFixed(1),
          owners: owners.map((u) => ({
            name: u.real_name || u.name,
            email: u.profile?.email,
            isPrimaryOwner: u.is_primary_owner,
          })),
          admins: admins.map((u) => ({
            name: u.real_name || u.name,
            email: u.profile?.email,
          })),
        },
      });
    } else {
      ctx.pass({
        title: 'Slack admin access is appropriately limited',
        description: `${totalAdminCount} users have admin/owner access (${adminPercentage.toFixed(1)}% of workspace).`,
        resourceType: 'workspace',
        resourceId: 'slack-admins',
        evidence: {
          totalUsers: activeUsers.length,
          ownerCount: owners.length,
          adminCount: admins.length,
          adminPercentage: adminPercentage.toFixed(1),
          owners: owners.map((u) => ({
            name: u.real_name || u.name,
            email: u.profile?.email,
          })),
          admins: admins.map((u) => ({
            name: u.real_name || u.name,
            email: u.profile?.email,
          })),
        },
      });
    }

    // Also check for guest users (restricted/ultra_restricted)
    const guests = activeUsers.filter((u) => u.is_restricted || u.is_ultra_restricted);
    if (guests.length > 0) {
      ctx.pass({
        title: `${guests.length} guest users in workspace`,
        description: 'Guest users have limited access to specific channels.',
        resourceType: 'workspace',
        resourceId: 'slack-guests',
        evidence: {
          guestCount: guests.length,
          multiChannelGuests: guests.filter((u) => u.is_restricted && !u.is_ultra_restricted)
            .length,
          singleChannelGuests: guests.filter((u) => u.is_ultra_restricted).length,
        },
      });
    }

    ctx.log('Slack admin access check complete');
  },
};
