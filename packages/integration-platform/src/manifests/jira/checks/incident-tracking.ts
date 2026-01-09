import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

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
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    created: string;
    updated: string;
    resolutiondate?: string;
    resolution?: {
      name: string;
    };
  };
}

/**
 * Check Jira for incident tracking
 * Maps to: Incident Response task
 */
export const incidentTrackingCheck: IntegrationCheck = {
  id: 'jira-incident-tracking',
  name: 'Jira Incident Tracking',
  description:
    'Verify that security incidents are tracked in Jira with proper workflows.',
  taskMapping: TASK_TEMPLATES.incidentResponse,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Jira incident tracking check');

    const cloudId = ctx.variables.cloud_id as string;
    if (!cloudId) {
      ctx.error('Jira Cloud ID is required');
      return;
    }

    const incidentProjectKey = ctx.variables.incident_project_key as string;

    // Build JQL for incident-like issues
    let jql: string;
    if (incidentProjectKey) {
      jql = `project = "${incidentProjectKey}" ORDER BY created DESC`;
    } else {
      // Search across all projects for incident-like issue types
      jql = `issuetype in (Incident, "Security Incident", Bug) AND (labels in (security, incident, breach) OR summary ~ "incident" OR summary ~ "security") ORDER BY created DESC`;
    }

    try {
      const response = await ctx.post<IssueSearchResponse>(
        `/ex/jira/${cloudId}/rest/api/3/search`,
        {
          jql,
          maxResults: 50,
          fields: [
            'summary',
            'status',
            'priority',
            'issuetype',
            'created',
            'updated',
            'resolutiondate',
            'resolution',
          ],
        },
      );

      const issues = response.issues || [];
      const total = response.total || 0;

      ctx.log(`Found ${total} incident-related issues`);

      if (total === 0) {
        if (incidentProjectKey) {
          ctx.fail({
            title: 'No incidents found in designated project',
            description: `No issues found in project ${incidentProjectKey}. Either no incidents have occurred, or they are not being tracked.`,
            resourceType: 'jira-incidents',
            resourceId: cloudId,
            severity: 'low',
            remediation: `Ensure security incidents are logged in Jira project "${incidentProjectKey}".
If no incidents have occurred, document this in your incident response log.`,
            evidence: {
              cloudId,
              incidentProjectKey,
              searchQuery: jql,
            },
          });
        } else {
          ctx.fail({
            title: 'No incident tracking detected',
            description: 'No incident-related issues found. Consider setting up a dedicated incident tracking project.',
            resourceType: 'jira-incidents',
            resourceId: cloudId,
            severity: 'medium',
            remediation: `Set up incident tracking in Jira:
1. Create a dedicated project for incidents (e.g., key: INC or SEC)
2. Create an "Incident" issue type with required fields
3. Define a workflow: Open → In Progress → Resolved → Closed
4. Configure the incident_project_key variable in this integration`,
            evidence: {
              cloudId,
              searchQuery: jql,
            },
          });
        }
        return;
      }

      // Analyze incidents
      const openIncidents = issues.filter(
        (i) =>
          !['Done', 'Closed', 'Resolved'].some((s) =>
            i.fields.status.name.toLowerCase().includes(s.toLowerCase()),
          ),
      );

      const resolvedIncidents = issues.filter((i) => i.fields.resolutiondate);

      // Calculate average resolution time for resolved incidents
      let avgResolutionHours = 0;
      if (resolvedIncidents.length > 0) {
        const totalHours = resolvedIncidents.reduce((sum, incident) => {
          const created = new Date(incident.fields.created).getTime();
          const resolved = new Date(incident.fields.resolutiondate!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0);
        avgResolutionHours = totalHours / resolvedIncidents.length;
      }

      // Check for high/critical open incidents
      const criticalOpen = openIncidents.filter((i) =>
        ['Highest', 'Critical', 'High', 'Blocker'].some(
          (p) => i.fields.priority?.name === p,
        ),
      );

      if (criticalOpen.length > 0) {
        ctx.fail({
          title: `${criticalOpen.length} high-priority incidents open`,
          description: `There are ${criticalOpen.length} high/critical priority incidents that require attention.`,
          resourceType: 'jira-incidents',
          resourceId: cloudId,
          severity: 'high',
          remediation: `Address these high-priority incidents:
${criticalOpen.map((i) => `- ${i.key}: ${i.fields.summary}`).join('\n')}`,
          evidence: {
            cloudId,
            totalIncidents: total,
            openCount: openIncidents.length,
            criticalOpenCount: criticalOpen.length,
            criticalIncidents: criticalOpen.map((i) => ({
              key: i.key,
              summary: i.fields.summary,
              priority: i.fields.priority?.name,
              status: i.fields.status.name,
              created: i.fields.created,
            })),
          },
        });
      } else {
        ctx.pass({
          title: 'Incident tracking active',
          description: `${total} incidents tracked. ${openIncidents.length} open, ${resolvedIncidents.length} resolved. Avg resolution: ${avgResolutionHours.toFixed(1)} hours.`,
          resourceType: 'jira-incidents',
          resourceId: cloudId,
          evidence: {
            cloudId,
            incidentProjectKey: incidentProjectKey || 'All projects',
            totalIncidents: total,
            openCount: openIncidents.length,
            resolvedCount: resolvedIncidents.length,
            avgResolutionHours: avgResolutionHours.toFixed(1),
            recentIncidents: issues.slice(0, 5).map((i) => ({
              key: i.key,
              summary: i.fields.summary,
              status: i.fields.status.name,
              priority: i.fields.priority?.name,
              created: i.fields.created,
            })),
          },
        });
      }
    } catch (error) {
      ctx.warn(`Could not search for incidents: ${error}`);

      ctx.fail({
        title: 'Unable to verify incident tracking',
        description: `Could not search Jira for incidents. Error: ${error}`,
        resourceType: 'jira-incidents',
        resourceId: cloudId,
        severity: 'medium',
        remediation: 'Ensure the integration has read access to the incident project.',
        evidence: {
          cloudId,
          error: String(error),
        },
      });
    }

    ctx.log('Jira incident tracking check complete');
  },
};
