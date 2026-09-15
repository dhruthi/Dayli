export class IdempotencyEngine {
  private processedIds = new Map<string, number>();
  private ttlMs = 24 * 60 * 60 * 1000; // 24 hours TTL

  /**
   * Check if message_id has already been processed. If not, record it.
   */
  isDuplicate(messageId: string): boolean {
    if (!messageId) return false;
    const existing = this.processedIds.get(messageId);
    if (existing) {
      if (Date.now() - existing < this.ttlMs) {
        return true; // Duplicate!
      } else {
        this.processedIds.delete(messageId);
      }
    }

    this.processedIds.set(messageId, Date.now());
    return false;
  }

  size(): number {
    return this.processedIds.size;
  }

  clear(): void {
    this.processedIds.clear();
  }
}

export const idempotencyEngine = new IdempotencyEngine();
