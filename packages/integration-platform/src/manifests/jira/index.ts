/**
 * Jira Integration Manifest
 *
 * This integration connects to Jira to monitor project management,
 * change tracking, and incident management for SOC2 compliance.
 */

import type { IntegrationManifest } from '../../types';
import {
  changeManagementCheck,
  incidentTrackingCheck,
  projectSecurityCheck,
} from './checks';

export const jiraManifest: IntegrationManifest = {
  id: 'jira',
  name: 'Jira',
  description:
    'Monitor Jira for change management, incident tracking, and project security settings.',
  category: 'Development',
  logoUrl: 'https://img.logo.dev/atlassian.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      scopes: [
        'read:jira-work',
        'read:jira-user',
        'read:project:jira',
        'read:issue-details:jira',
        'read:audit-log:jira',
        'offline_access',
      ],
      pkce: true,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        audience: 'api.atlassian.com',
        prompt: 'consent',
      },
      setupInstructions: `## Setup Jira Integration

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Click **Create** → **OAuth 2.0 integration**
3. Enter app name (e.g., "CompAI Integration")
4. Under **Permissions**, add:
   - **Jira API**:
     - \`read:jira-work\` - Read projects and issues
     - \`read:jira-user\` - Read user information
     - \`read:audit-log:jira\` - Read audit logs
5. Under **Authorization**, add the callback URL shown below
6. Copy **Client ID** and **Client Secret**

**Note:** Requires Jira Cloud (not Jira Server/Data Center).`,
      createAppUrl: 'https://developer.atlassian.com/console/myapps/',
    },
  },

  baseUrl: 'https://api.atlassian.com',
  defaultHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  capabilities: ['checks'],

  // Integration variables
  variables: [
    {
      id: 'cloud_id',
      label: 'Jira Cloud ID',
      type: 'text',
      required: true,
      helpText:
        'Your Jira Cloud ID. Found in your Jira URL or via /oauth/token/accessible-resources API.',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      id: 'incident_project_key',
      label: 'Incident Project Key',
      type: 'text',
      required: false,
      helpText: 'Project key for incident tracking (e.g., INC, SEC). Leave empty to skip incident checks.',
      placeholder: 'INC',
    },
  ],

  checks: [changeManagementCheck, incidentTrackingCheck, projectSecurityCheck],
};

export default jiraManifest;
