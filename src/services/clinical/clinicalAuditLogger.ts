import { ClinicalAuditEntry, ClinicalRiskLevel } from './types';

export class ClinicalAuditLogger {
  private logs: ClinicalAuditEntry[] = [];
  private maxLogs = 100;

  logAudit(entry: {
    requestId: string;
    ruleVersion: string;
    riskLevel: ClinicalRiskLevel;
    reasonCodes: string[];
    symptomsNoted: string[];
    requiresReferral: boolean;
    requiresImmediateAction: boolean;
    ticketId?: string;
  }): ClinicalAuditEntry {
    const auditRecord: ClinicalAuditEntry = {
      request_id: entry.requestId,
      timestamp: new Date().toISOString(),
      rule_version: entry.ruleVersion,
      risk_level: entry.riskLevel,
      reason_codes: entry.reasonCodes,
      symptoms_noted: entry.symptomsNoted,
      requires_referral: entry.requiresReferral,
      requires_immediate_action: entry.requiresImmediateAction,
      ticket_id: entry.ticketId,
      overridden_by_llm: false,
    };

    this.logs.unshift(auditRecord);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    console.log(
      `[Clinical Audit Log] req:${auditRecord.request_id} | risk:${auditRecord.risk_level} | referral:${auditRecord.requires_referral} | reasons:${auditRecord.reason_codes.join(',')}`
    );

    return auditRecord;
  }

  getAuditLogs(): ClinicalAuditEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const clinicalAuditLogger = new ClinicalAuditLogger();
