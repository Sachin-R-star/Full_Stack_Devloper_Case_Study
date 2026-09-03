export interface AuditEvent {
  action: string;
  userId?: string;
  organizationId?: string;
  ip?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export class AuditLogger {
  private static logs: AuditEvent[] = [];

  /**
   * Records a security-relevant audit event
   */
  static log(
    action: string,
    context: {
      userId?: string;
      organizationId?: string;
      ip?: string;
      details?: Record<string, any>;
    }
  ): AuditEvent {
    const event: AuditEvent = {
      action,
      userId: context.userId,
      organizationId: context.organizationId,
      ip: context.ip,
      details: context.details,
      timestamp: new Date().toISOString(),
    };

    // Print structured log line to stdout
    console.log(`[AUDIT LOG] ${event.timestamp} | Action: ${event.action} | Org: ${event.organizationId || 'GLOBAL'} | User: ${event.userId || 'ANONYMOUS'} | IP: ${event.ip || 'UNKNOWN'}`);

    this.logs.push(event);
    if (this.logs.length > 1000) {
      this.logs.shift(); // Keep buffer bounded
    }

    return event;
  }

  /**
   * Retrieves recent audit logs (for administrative review)
   */
  static getRecentLogs(organizationId?: string): AuditEvent[] {
    if (!organizationId) {
      return [...this.logs];
    }
    return this.logs.filter((l) => l.organizationId === organizationId);
  }
}
