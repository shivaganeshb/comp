import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface FirewallRule {
  name: string;
  selfLink: string;
  network: string;
  priority: number;
  direction: 'INGRESS' | 'EGRESS';
  disabled: boolean;
  allowed?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  denied?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  sourceServiceAccounts?: string[];
  targetServiceAccounts?: string[];
  description?: string;
}

interface FirewallsResponse {
  items?: FirewallRule[];
  nextPageToken?: string;
}

// Sensitive ports that should not be open to the internet
const SENSITIVE_PORTS = [
  { port: '22', name: 'SSH' },
  { port: '3389', name: 'RDP' },
  { port: '3306', name: 'MySQL' },
  { port: '5432', name: 'PostgreSQL' },
  { port: '1433', name: 'MSSQL' },
  { port: '27017', name: 'MongoDB' },
  { port: '6379', name: 'Redis' },
  { port: '9200', name: 'Elasticsearch' },
  { port: '5601', name: 'Kibana' },
  { port: '8080', name: 'HTTP Alt' },
  { port: '23', name: 'Telnet' },
  { port: '21', name: 'FTP' },
  { port: '445', name: 'SMB' },
  { port: '135', name: 'RPC' },
];

/**
 * Check VPC Firewall rules configuration
 * Maps to: Production Firewall & No-Public-Access Controls task
 */
export const firewallRulesCheck: IntegrationCheck = {
  id: 'gcp-firewall-rules',
  name: 'VPC Firewall Rules Analysis',
  description:
    'Analyze VPC firewall rules to ensure sensitive ports are not exposed to the internet (0.0.0.0/0) and that rules follow security best practices.',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Firewall Rules check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for firewall rules check');
      return;
    }

    ctx.log(`Checking firewall rules for project: ${projectId}`);

    // Fetch all firewall rules
    const allRules: FirewallRule[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { maxResults: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<FirewallsResponse>(
        `https://compute.googleapis.com/compute/v1/projects/${projectId}/global/firewalls`,
        { params },
      );

      if (response.items) {
        allRules.push(...response.items);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allRules.length} firewall rules`);

    let criticalFindings = 0;

    for (const rule of allRules) {
      // Skip egress rules and disabled rules
      if (rule.direction === 'EGRESS' || rule.disabled) {
        continue;
      }

      // Check if rule allows traffic from anywhere (0.0.0.0/0)
      const allowsFromAnywhere = rule.sourceRanges?.some(
        (range) => range === '0.0.0.0/0' || range === '::/0',
      );

      if (!allowsFromAnywhere) {
        // Rule is properly scoped
        ctx.pass({
          title: `Firewall rule ${rule.name} has restricted source`,
          description: `Rule does not allow traffic from 0.0.0.0/0 (the internet).`,
          resourceType: 'firewall-rule',
          resourceId: rule.name,
          evidence: {
            ruleName: rule.name,
            direction: rule.direction,
            sourceRanges: rule.sourceRanges,
            priority: rule.priority,
          },
        });
        continue;
      }

      // Rule allows from anywhere - check what ports are open
      const allowedPorts: string[] = [];
      const allowedProtocols: string[] = [];

      for (const allow of rule.allowed || []) {
        allowedProtocols.push(allow.IPProtocol);
        if (allow.ports) {
          allowedPorts.push(...allow.ports);
        } else if (allow.IPProtocol !== 'icmp') {
          // All ports allowed for this protocol
          allowedPorts.push('all');
        }
      }

      // Check for all ports allowed
      if (allowedPorts.includes('all')) {
        criticalFindings++;
        ctx.fail({
          title: `Firewall rule ${rule.name} allows all ports from internet`,
          description: `This rule allows traffic from 0.0.0.0/0 to all ports, which exposes all services to the internet.`,
          resourceType: 'firewall-rule',
          resourceId: rule.name,
          severity: 'critical',
          remediation: `Restrict this firewall rule:
1. Go to VPC Network > Firewall in Cloud Console
2. Edit rule "${rule.name}"
3. Either:
   - Specify only necessary ports
   - Restrict source IP ranges to known IPs
   - Add target tags to limit scope
4. Consider using Cloud IAP for secure access`,
          evidence: {
            ruleName: rule.name,
            sourceRanges: rule.sourceRanges,
            allowedProtocols,
            priority: rule.priority,
            network: rule.network,
          },
        });
        continue;
      }

      // Check for sensitive ports exposed to internet
      const exposedSensitivePorts: Array<{ port: string; name: string }> = [];

      for (const sensitive of SENSITIVE_PORTS) {
        const isExposed = allowedPorts.some((portSpec) => {
          if (portSpec === sensitive.port) return true;
          // Handle port ranges like "1000-2000"
          if (portSpec.includes('-')) {
            const [start, end] = portSpec.split('-').map(Number);
            const portNum = Number(sensitive.port);
            return portNum >= start && portNum <= end;
          }
          return false;
        });

        if (isExposed) {
          exposedSensitivePorts.push(sensitive);
        }
      }

      if (exposedSensitivePorts.length > 0) {
        criticalFindings++;
        ctx.fail({
          title: `Firewall rule ${rule.name} exposes sensitive ports to internet`,
          description: `Sensitive ports (${exposedSensitivePorts.map((p) => `${p.name}/${p.port}`).join(', ')}) are accessible from 0.0.0.0/0.`,
          resourceType: 'firewall-rule',
          resourceId: rule.name,
          severity: 'high',
          remediation: `Secure these sensitive ports:
1. Go to VPC Network > Firewall in Cloud Console
2. Edit rule "${rule.name}"
3. Either:
   - Remove ports: ${exposedSensitivePorts.map((p) => p.port).join(', ')}
   - Restrict source to specific IP ranges
   - Use Cloud IAP for SSH/RDP access
   - Use Cloud SQL Auth Proxy for database access`,
          evidence: {
            ruleName: rule.name,
            sourceRanges: rule.sourceRanges,
            exposedPorts: exposedSensitivePorts,
            allAllowedPorts: allowedPorts,
            priority: rule.priority,
          },
        });
      } else {
        // Rule allows from internet but only to non-sensitive ports (e.g., 80, 443)
        ctx.pass({
          title: `Firewall rule ${rule.name} allows internet access to standard ports`,
          description: `Rule allows traffic from 0.0.0.0/0 but only to standard web ports.`,
          resourceType: 'firewall-rule',
          resourceId: rule.name,
          evidence: {
            ruleName: rule.name,
            sourceRanges: rule.sourceRanges,
            allowedPorts,
            priority: rule.priority,
          },
        });
      }
    }

    // Overall summary
    if (criticalFindings === 0) {
      ctx.pass({
        title: 'No critical firewall exposures found',
        description: `Reviewed ${allRules.length} firewall rules. No sensitive ports are exposed to the internet.`,
        resourceType: 'project',
        resourceId: projectId,
        evidence: {
          projectId,
          totalRules: allRules.length,
          criticalFindings: 0,
        },
      });
    }

    ctx.log('GCP Firewall Rules check complete');
  },
};
