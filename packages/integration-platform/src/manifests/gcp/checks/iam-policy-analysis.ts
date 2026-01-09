import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type { GCPIAMPolicy } from '../types';

// Privileged roles that grant broad access - these need careful review
const PRIVILEGED_ROLES = [
  'roles/owner',
  'roles/editor',
  'roles/iam.securityAdmin',
  'roles/iam.serviceAccountAdmin',
  'roles/iam.serviceAccountKeyAdmin',
  'roles/resourcemanager.projectIamAdmin',
  'roles/resourcemanager.organizationAdmin',
  'roles/compute.admin',
  'roles/storage.admin',
  'roles/bigquery.admin',
  'roles/cloudsql.admin',
];

/**
 * Check IAM policies for least privilege compliance
 * Maps to: Role-based Access Controls task
 */
export const iamPolicyAnalysisCheck: IntegrationCheck = {
  id: 'gcp-iam-policy-analysis',
  name: 'IAM Least Privilege Analysis',
  description:
    'Analyze IAM policies to ensure principle of least privilege is followed. Flags overly permissive roles and broad member assignments.',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP IAM Policy Analysis check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for IAM policy analysis');
      return;
    }

    ctx.log(`Analyzing IAM policy for project: ${projectId}`);

    // Fetch IAM policy for the project
    const policy = await ctx.post<GCPIAMPolicy>(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`,
      { options: { requestedPolicyVersion: 3 } },
    );

    ctx.log(`Found ${policy.bindings?.length || 0} IAM bindings`);

    let hasPrivilegedAllUsers = false;
    let hasPrivilegedAllAuth = false;

    for (const binding of policy.bindings || []) {
      const role = binding.role;
      const members = binding.members || [];
      const isPrivilegedRole = PRIVILEGED_ROLES.includes(role);

      // Check for public access (allUsers or allAuthenticatedUsers)
      const hasAllUsers = members.includes('allUsers');
      const hasAllAuth = members.includes('allAuthenticatedUsers');

      if (isPrivilegedRole && (hasAllUsers || hasAllAuth)) {
        hasPrivilegedAllUsers = hasAllUsers;
        hasPrivilegedAllAuth = hasAllAuth;

        ctx.fail({
          title: `Public access to privileged role: ${role}`,
          description: `The privileged role ${role} is granted to ${hasAllUsers ? 'allUsers (anyone on the internet)' : 'allAuthenticatedUsers (any Google account)'}, which violates the principle of least privilege.`,
          resourceType: 'iam-binding',
          resourceId: `${projectId}/${role}`,
          severity: 'critical',
          remediation: `1. Go to IAM & Admin in Google Cloud Console
2. Find the binding for ${role}
3. Remove ${hasAllUsers ? 'allUsers' : 'allAuthenticatedUsers'} from the members
4. Grant this role only to specific users, groups, or service accounts that need it`,
          evidence: {
            projectId,
            role,
            members,
            hasAllUsers,
            hasAllAuth,
          },
        });
      } else if (isPrivilegedRole) {
        // Privileged role but properly scoped - still worth documenting
        ctx.pass({
          title: `Privileged role ${role} is properly scoped`,
          description: `The role ${role} is granted to ${members.length} specific members without public access.`,
          resourceType: 'iam-binding',
          resourceId: `${projectId}/${role}`,
          evidence: {
            projectId,
            role,
            memberCount: members.length,
            members: members.slice(0, 10), // First 10 for evidence
          },
        });
      } else if (hasAllUsers || hasAllAuth) {
        // Non-privileged role but has public access
        ctx.fail({
          title: `Public access granted for role: ${role}`,
          description: `The role ${role} is granted to ${hasAllUsers ? 'allUsers' : 'allAuthenticatedUsers'}. Review if this is intentional.`,
          resourceType: 'iam-binding',
          resourceId: `${projectId}/${role}`,
          severity: 'medium',
          remediation: `Review if ${role} should be publicly accessible. If not:
1. Go to IAM & Admin in Google Cloud Console
2. Remove the public member from this role
3. Grant to specific users or service accounts instead`,
          evidence: {
            projectId,
            role,
            members,
          },
        });
      }
    }

    // Overall pass if no critical issues
    if (!hasPrivilegedAllUsers && !hasPrivilegedAllAuth) {
      ctx.pass({
        title: 'No privileged roles with public access',
        description:
          'The project IAM policy does not grant privileged roles to allUsers or allAuthenticatedUsers.',
        resourceType: 'project',
        resourceId: projectId,
        evidence: {
          projectId,
          totalBindings: policy.bindings?.length || 0,
          checkedAt: new Date().toISOString(),
        },
      });
    }

    ctx.log('GCP IAM Policy Analysis check complete');
  },
};
