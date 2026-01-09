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
  lead?: {
    accountId: string;
    displayName: string;
  };
}

interface ProjectRoleResponse {
  actors: ProjectRoleActor[];
}

interface ProjectRoleActor {
  id: number;
  displayName: string;
  type: string;
  actorUser?: {
    accountId: string;
  };
  actorGroup?: {
    displayName: string;
    groupId: string;
  };
}

/**
 * Check Jira project security and access controls
 * Maps to: Role-based Access Controls task
 */
export const projectSecurityCheck: IntegrationCheck = {
  id: 'jira-project-security',
  name: 'Jira Project Security',
  description:
    'Verify Jira projects have proper access controls and role assignments.',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Jira project security check');

    const cloudId = ctx.variables.cloud_id as string;
    if (!cloudId) {
      ctx.error('Jira Cloud ID is required');
      return;
    }

    try {
      // Fetch all projects
      const projectsResponse = await ctx.fetch<ProjectSearchResponse>(
        `/ex/jira/${cloudId}/rest/api/3/project/search`,
        {
          params: {
            maxResults: '50',
            expand: 'lead',
          },
        },
      );

      const projects = projectsResponse.values || [];
      ctx.log(`Found ${projects.length} Jira projects`);

      if (projects.length === 0) {
        ctx.fail({
          title: 'No Jira projects found',
          description:
            'No accessible Jira projects were found. Ensure the integration has proper permissions.',
          resourceType: 'jira-projects',
          resourceId: cloudId,
          severity: 'high',
          remediation:
            'Grant read access to at least one Jira project for security verification.',
          evidence: { cloudId },
        });
        return;
      }

      // Check project leads and basic configuration
      const projectsWithoutLeads = projects.filter((p) => !p.lead);
      const projectDetails: Array<{
        key: string;
        name: string;
        hasLead: boolean;
        leadName?: string;
        type: string;
      }> = [];

      for (const project of projects.slice(0, 10)) {
        projectDetails.push({
          key: project.key,
          name: project.name,
          hasLead: !!project.lead,
          leadName: project.lead?.displayName,
          type: project.projectTypeKey,
        });
      }

      // Try to check project roles for the first project
      let roleCheckPerformed = false;
      let adminCount = 0;

      if (projects.length > 0) {
        const firstProject = projects[0];
        try {
          // Get Administrator role actors
          const adminRole = await ctx.fetch<ProjectRoleResponse>(
            `/ex/jira/${cloudId}/rest/api/3/project/${firstProject.key}/role/10002`,
          );
          adminCount = adminRole.actors?.length || 0;
          roleCheckPerformed = true;
        } catch {
          // Role check might fail if permission denied
          ctx.log('Could not check project roles - may require additional permissions');
        }
      }

      if (projectsWithoutLeads.length > 0) {
        ctx.fail({
          title: `${projectsWithoutLeads.length} projects without assigned leads`,
          description: `${projectsWithoutLeads.length} out of ${projects.length} projects do not have a designated lead.`,
          resourceType: 'jira-projects',
          resourceId: cloudId,
          severity: 'medium',
          remediation: `Assign a project lead to each Jira project:
${projectsWithoutLeads
  .slice(0, 5)
  .map((p) => `- ${p.key}: ${p.name}`)
  .join('\n')}
${projectsWithoutLeads.length > 5 ? `\n...and ${projectsWithoutLeads.length - 5} more` : ''}`,
          evidence: {
            cloudId,
            totalProjects: projects.length,
            projectsWithoutLeads: projectsWithoutLeads.length,
            affectedProjects: projectsWithoutLeads.slice(0, 10).map((p) => ({
              key: p.key,
              name: p.name,
            })),
          },
        });
      } else {
        ctx.pass({
          title: 'All Jira projects have assigned leads',
          description: `${projects.length} projects verified with proper lead assignments.${roleCheckPerformed ? ` Sample project has ${adminCount} administrators.` : ''}`,
          resourceType: 'jira-projects',
          resourceId: cloudId,
          evidence: {
            cloudId,
            totalProjects: projects.length,
            projectDetails,
            roleCheckPerformed,
            sampleAdminCount: roleCheckPerformed ? adminCount : undefined,
          },
        });
      }
    } catch (error) {
      ctx.warn(`Could not verify project security: ${error}`);

      ctx.fail({
        title: 'Unable to verify project security',
        description: `Could not access Jira projects. Error: ${error}`,
        resourceType: 'jira-projects',
        resourceId: cloudId,
        severity: 'medium',
        remediation:
          'Ensure the integration has read:project:jira and read:jira-work scopes.',
        evidence: {
          cloudId,
          error: String(error),
        },
      });
    }

    ctx.log('Jira project security check complete');
  },
};
