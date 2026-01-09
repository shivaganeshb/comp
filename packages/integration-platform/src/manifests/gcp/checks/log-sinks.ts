import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';

interface LogSink {
  name: string;
  destination: string;
  filter?: string;
  disabled: boolean;
  createTime?: string;
  updateTime?: string;
  writerIdentity?: string;
  includeChildren?: boolean;
}

interface LogSinksResponse {
  sinks?: LogSink[];
  nextPageToken?: string;
}

interface LogMetric {
  name: string;
  description?: string;
  filter: string;
  disabled?: boolean;
  metricDescriptor?: {
    type: string;
    metricKind: string;
    valueType: string;
  };
}

interface LogMetricsResponse {
  metrics?: LogMetric[];
  nextPageToken?: string;
}

/**
 * Check Cloud Logging sinks and log-based metrics configuration
 * Maps to: Backup logs task
 */
export const logSinksCheck: IntegrationCheck = {
  id: 'gcp-log-sinks',
  name: 'Cloud Logging Sinks & Retention',
  description:
    'Verify log sinks are configured for long-term retention and that security-relevant logs are being exported to durable storage.',
  taskMapping: TASK_TEMPLATES.backupLogs,
  defaultSeverity: 'medium',

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Log Sinks check');

    const projectId = ctx.variables.project_id as string;
    if (!projectId) {
      ctx.error('Project ID is required for log sinks check');
      return;
    }

    ctx.log(`Checking log sinks for project: ${projectId}`);

    // Fetch all log sinks
    const allSinks: LogSink[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<LogSinksResponse>(
        `https://logging.googleapis.com/v2/projects/${projectId}/sinks`,
        { params },
      );

      if (response.sinks) {
        allSinks.push(...response.sinks);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allSinks.length} log sinks`);

    // Fetch log-based metrics
    const allMetrics: LogMetric[] = [];
    pageToken = undefined;

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<LogMetricsResponse>(
        `https://logging.googleapis.com/v2/projects/${projectId}/metrics`,
        { params },
      );

      if (response.metrics) {
        allMetrics.push(...response.metrics);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    ctx.log(`Found ${allMetrics.length} log-based metrics`);

    // Check if there's at least one sink for long-term retention
    const activeSinks = allSinks.filter((s) => !s.disabled);
    const hasStorageSink = activeSinks.some((s) =>
      s.destination.startsWith('storage.googleapis.com/'),
    );
    const hasBigQuerySink = activeSinks.some((s) => s.destination.startsWith('bigquery.googleapis.com/'));
    const hasPubSubSink = activeSinks.some((s) =>
      s.destination.startsWith('pubsub.googleapis.com/'),
    );

    if (activeSinks.length === 0) {
      ctx.fail({
        title: 'No active log sinks configured',
        description:
          'The project has no active log sinks. Logs are only retained for 30 days by default. For SOC2 compliance, logs should be exported for long-term retention.',
        resourceType: 'project',
        resourceId: projectId,
        severity: 'high',
        remediation: `Configure log sinks for long-term retention:
1. Go to Logging > Log Router in Cloud Console
2. Click "Create Sink"
3. Choose a destination:
   - Cloud Storage for cost-effective archival
   - BigQuery for queryable long-term storage
4. Set appropriate filters (or export all logs)
5. Configure retention policy on the destination`,
        evidence: {
          projectId,
          totalSinks: allSinks.length,
          activeSinks: 0,
        },
      });
    } else {
      // Check each sink
      for (const sink of activeSinks) {
        const destinationType = getDestinationType(sink.destination);
        const sinkId = sink.name.split('/').pop() || sink.name;

        ctx.pass({
          title: `Log sink ${sinkId} exports to ${destinationType}`,
          description: `Log sink is configured to export logs to ${destinationType} for retention.`,
          resourceType: 'log-sink',
          resourceId: sinkId,
          evidence: {
            sinkName: sinkId,
            destination: sink.destination,
            destinationType,
            filter: sink.filter || 'All logs',
            includeChildren: sink.includeChildren,
            createTime: sink.createTime,
          },
        });
      }

      // Summary based on destination types
      if (hasStorageSink || hasBigQuerySink) {
        ctx.pass({
          title: 'Long-term log retention configured',
          description: `Project has log sinks exporting to ${hasStorageSink ? 'Cloud Storage' : ''}${hasStorageSink && hasBigQuerySink ? ' and ' : ''}${hasBigQuerySink ? 'BigQuery' : ''} for long-term retention.`,
          resourceType: 'project',
          resourceId: projectId,
          evidence: {
            projectId,
            hasStorageSink,
            hasBigQuerySink,
            hasPubSubSink,
            totalActiveSinks: activeSinks.length,
          },
        });
      } else if (hasPubSubSink && !hasStorageSink && !hasBigQuerySink) {
        ctx.fail({
          title: 'Log sinks only export to Pub/Sub',
          description:
            'Log sinks export to Pub/Sub but not to durable storage. Ensure downstream systems provide long-term retention.',
          resourceType: 'project',
          resourceId: projectId,
          severity: 'low',
          remediation: `Consider adding a sink directly to Cloud Storage or BigQuery:
1. Go to Logging > Log Router
2. Create additional sink to Cloud Storage or BigQuery
3. Or verify Pub/Sub consumers archive logs durably`,
          evidence: {
            projectId,
            hasStorageSink,
            hasBigQuerySink,
            hasPubSubSink,
          },
        });
      }
    }

    // Check for disabled sinks
    const disabledSinks = allSinks.filter((s) => s.disabled);
    if (disabledSinks.length > 0) {
      ctx.warn(`${disabledSinks.length} log sink(s) are disabled`);
      for (const sink of disabledSinks) {
        const sinkId = sink.name.split('/').pop() || sink.name;
        ctx.fail({
          title: `Log sink ${sinkId} is disabled`,
          description: `This log sink is disabled and not exporting logs. If this sink was used for compliance, logs are not being retained.`,
          resourceType: 'log-sink',
          resourceId: sinkId,
          severity: 'medium',
          remediation: `Enable the sink or remove if no longer needed:
1. Go to Logging > Log Router
2. Find sink "${sinkId}"
3. Enable or delete the sink`,
          evidence: {
            sinkName: sinkId,
            destination: sink.destination,
            disabled: true,
          },
        });
      }
    }

    // Check log-based metrics for security monitoring
    const securityMetrics = allMetrics.filter(
      (m) =>
        !m.disabled &&
        (m.filter.toLowerCase().includes('auth') ||
          m.filter.toLowerCase().includes('iam') ||
          m.filter.toLowerCase().includes('error') ||
          m.filter.toLowerCase().includes('security')),
    );

    if (securityMetrics.length > 0) {
      ctx.pass({
        title: `${securityMetrics.length} security-related log metrics configured`,
        description: `Custom log-based metrics are configured for security monitoring.`,
        resourceType: 'project',
        resourceId: projectId,
        evidence: {
          projectId,
          securityMetricCount: securityMetrics.length,
          metrics: securityMetrics.map((m) => ({
            name: m.name,
            filter: m.filter,
          })),
        },
      });
    }

    ctx.log('GCP Log Sinks check complete');
  },
};

function getDestinationType(destination: string): string {
  if (destination.startsWith('storage.googleapis.com/')) return 'Cloud Storage';
  if (destination.startsWith('bigquery.googleapis.com/')) return 'BigQuery';
  if (destination.startsWith('pubsub.googleapis.com/')) return 'Pub/Sub';
  if (destination.startsWith('logging.googleapis.com/')) return 'Cloud Logging';
  return 'Unknown';
}
