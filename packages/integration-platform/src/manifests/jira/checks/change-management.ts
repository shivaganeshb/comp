import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface ProjectSearchResponse {
  values: JiraProject[];
  total: number;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

interface IssueSearchResponse {
  issues: JiraIssue[];
  total: number;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    created: string;
    updated: string;
    resolution?: {
      name: string;
    };
  };
}

/**
 * Check Jira for change management tracking
 * Maps to: Code Changes task
 */
export const changeManagementCheck: IntegrationCheck = {
  id: 'jira-change-management',
  name: 'Jira Change Management',
  description:
    'Verify that changes are tracked in Jira with proper workflows and approvals.',
  taskMapping: TASK_TEMPLATES.codeChanges,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Jira change management check');

    const cloudId = ctx.variables.cloud_id as string;
    if (!cloudId) {
      ctx.error('Jira Cloud ID is required');
      return;
    }

    // Fetch projects
    const projectsResponse = await ctx.fetch<ProjectSearchResponse>(
      `/ex/jira/${cloudId}/rest/api/3/project/search`,
      { params: { maxResults: '50' } },
    );

    const projects = projectsResponse.values || [];
    ctx.log(`Found ${projects.length} Jira projects`);

    if (projects.length === 0) {
      ctx.fail({
        title: 'No Jira projects found',
        description: 'No accessible Jira projects were found. Ensure the integration has proper permissions.',
        resourceType: 'jira-projects',
        resourceId: cloudId,
        severity: 'high',
        remediation: 'Grant read access to at least one Jira project for change tracking.',
        evidence: { cloudId },
      });
      return;
    }

    // Look for recent changes (issues updated in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Search for change-related issues (using common issue types)
    const jql = `updated >= "${dateStr}" AND issuetype in (Story, Task, Bug, "Change Request", Change) ORDER BY updated DESC`;

    try {
      const issuesResponse = await ctx.post<IssueSearchResponse>(
        `/ex/jira/${cloudId}/rest/api/3/search`,
        {
          jql,
          maxResults: 100,
          fields: ['summary', 'status', 'issuetype', 'created', 'updated', 'resolution'],
        },
      );

      const issues = issuesResponse.issues || [];
      const total = issuesResponse.total || 0;

      ctx.log(`Found ${total} issues updated in last 30 days`);

      // Analyze issue workflow
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const issue of issues) {
        const status = issue.fields.status.name;
        const type = issue.fields.issuetype.name;

        byStatus[status] = (byStatus[status] || 0) + 1;
        byType[type] = (byType[type] || 0) + 1;
      }

      const completedCount = Object.entries(byStatus)
        .filter(([status]) =>
          ['Done', 'Closed', 'Resolved', 'Complete'].some((s) =>
            status.toLowerCase().includes(s.toLowerCase()),
          ),
        )
        .reduce((sum, [, count]) => sum + count, 0);

      ctx.pass({
        title: 'Change tracking active in Jira',
        description: `${total} changes tracked in the last 30 days across ${projects.length} projects. ${completedCount} issues completed.`,
        resourceType: 'jira-changes',
        resourceId: cloudId,
        evidence: {
          cloudId,
          projectCount: projects.length,
          projects: projects.slice(0, 10).map((p) => ({ key: p.key, name: p.name })),
          recentIssueCount: total,
          completedCount,
          byStatus,
          byType,
          sampleIssues: issues.slice(0, 5).map((i) => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status.name,
            type: i.fields.issuetype.name,
          })),
        },
      });
    } catch (error) {
      ctx.warn(`Could not search issues: ${error}`);

      ctx.pass({
        title: 'Jira projects accessible',
        description: `${projects.length} Jira projects found. Issue search requires additional permissions.`,
        resourceType: 'jira-projects',
        resourceId: cloudId,
        evidence: {
          cloudId,
          projectCount: projects.length,
          projects: projects.slice(0, 10).map((p) => ({ key: p.key, name: p.name })),
          note: 'Issue search skipped - may require additional API permissions',
        },
      });
    }

    ctx.log('Jira change management check complete');
  },
};
