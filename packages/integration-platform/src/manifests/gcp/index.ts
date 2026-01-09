import type { IntegrationManifest } from '../../types';
import {
  alertingPoliciesCheck,
  auditLogsCheck,
  encryptionAtRestCheck,
  firewallRulesCheck,
  iamPolicyAnalysisCheck,
  logSinksCheck,
  serviceAccountKeysCheck,
} from './checks';

export const gcpManifest: IntegrationManifest = {
  id: 'gcp',
  name: 'Google Cloud Platform',
  description:
    'SOC2 compliance monitoring for GCP: IAM policies, encryption, audit logs, alerting, firewall rules, and more.',
  category: 'Cloud',
  logoUrl:
    'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://cloud.google.com/security-command-center/docs',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform.read-only',
        'https://www.googleapis.com/auth/compute.readonly',
        'https://www.googleapis.com/auth/devstorage.read_only',
        'https://www.googleapis.com/auth/logging.read',
        'https://www.googleapis.com/auth/monitoring.read',
        'https://www.googleapis.com/auth/sqlservice.admin',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      setupInstructions: `## Platform Admin: Enable GCP OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project for your OAuth app
3. Navigate to **APIs & Services** → **OAuth consent screen** and configure it
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Select **Web application**
7. Add the callback URL shown below to **Authorized redirect URIs**
8. Copy the **Client ID** and **Client Secret** below

---

### Required APIs

Enable these APIs in your GCP project:
- Cloud Resource Manager API
- Identity and Access Management (IAM) API
- Compute Engine API
- Cloud Storage API
- Cloud Logging API
- Cloud Monitoring API
- Cloud SQL Admin API

### Required IAM Roles

Grant the connecting user these read-only roles:
- **Viewer** (\`roles/viewer\`) - Basic read access
- **Security Reviewer** (\`roles/iam.securityReviewer\`) - IAM policy analysis
- **Logs Viewer** (\`roles/logging.viewer\`) - Log sinks and metrics

These are read-only roles that allow compliance monitoring without modification access.`,
      createAppUrl: 'https://console.cloud.google.com/apis/credentials',
    },
  },

  baseUrl: 'https://cloudresourcemanager.googleapis.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  capabilities: ['checks'],

  // Integration-level variables (used by compliance checks)
  variables: [
    {
      id: 'organization_id',
      label: 'GCP Organization ID',
      type: 'text',
      required: false,
      helpText:
        'Your GCP Organization ID (numeric). Find it at: console.cloud.google.com/iam-admin/settings. Required for org-level checks.',
      placeholder: '123456789012',
    },
    {
      id: 'project_id',
      label: 'GCP Project ID',
      type: 'text',
      required: true,
      helpText:
        'The GCP Project ID to monitor. Find it at: console.cloud.google.com/home/dashboard',
      placeholder: 'my-project-id',
    },
  ],

  checks: [
    iamPolicyAnalysisCheck,
    serviceAccountKeysCheck,
    auditLogsCheck,
    alertingPoliciesCheck,
    encryptionAtRestCheck,
    firewallRulesCheck,
    logSinksCheck,
  ],
};
