/**
 * Slack Integration Manifest
 *
 * This integration connects to Slack to monitor workspace security,
 * audit logs, and access controls for SOC2 compliance.
 */

import type { IntegrationManifest } from '../../types';
import {
  adminAccessCheck,
  auditLogsCheck,
  dataRetentionCheck,
  twoFactorAuthCheck,
} from './checks';

export const slackManifest: IntegrationManifest = {
  id: 'slack',
  name: 'Slack',
  description:
    'Monitor Slack workspace security settings, audit logs, and access controls for SOC2 compliance.',
  category: 'Communication',
  logoUrl: 'https://img.logo.dev/slack.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://api.slack.com/admins',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: [
        'admin.teams:read',
        'admin.users:read',
        'admin.conversations:read',
        'team:read',
        'users:read',
        'usergroups:read',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      setupInstructions: `## Setup Slack Integration

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Enter app name (e.g., "CompAI Integration") and select your workspace
4. Go to **OAuth & Permissions** in the sidebar
5. Add the following **User Token Scopes**:
   - \`admin.teams:read\` - Read workspace settings
   - \`admin.users:read\` - Read user admin info
   - \`admin.conversations:read\` - Read conversation settings
   - \`team:read\` - Read team info
   - \`users:read\` - Read user info
   - \`usergroups:read\` - Read user groups
6. Add the callback URL shown below to **Redirect URLs**
7. Copy **Client ID** and **Client Secret** from **Basic Information**

**Note:** Requires Enterprise Grid or Business+ plan for full admin API access.`,
      createAppUrl: 'https://api.slack.com/apps',
    },
  },

  baseUrl: 'https://slack.com/api',
  defaultHeaders: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },

  capabilities: ['checks'],

  checks: [twoFactorAuthCheck, adminAccessCheck, auditLogsCheck, dataRetentionCheck],
};

export default slackManifest;
