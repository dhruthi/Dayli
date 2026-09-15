export interface AILogEntry {
  requestId: string;
  timestamp: string;
  intent: string;
  model: string;
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  riskLevel: string;
  tokensUsed?: number;
  promptVersion: string;
  errorMessage?: string;
}

export class AILogger {
  private logs: AILogEntry[] = [];
  private maxLogs = 50;

  log(entry: Omit<AILogEntry, 'timestamp'>): void {
    const fullEntry: AILogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Clean, structured non-sensitive console log
    console.log(
      `[AI Orchestrator Log] req:${fullEntry.requestId} | intent:${fullEntry.intent} | risk:${fullEntry.riskLevel} | latency:${fullEntry.latencyMs}ms | fallback:${fullEntry.fallbackUsed}`
    );
  }

  getLogs(): AILogEntry[] {
    return [...this.logs];
  }

  getLatestLog(): AILogEntry | undefined {
    return this.logs[0];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const aiLogger = new AILogger();
