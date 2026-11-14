import { AiModelConfig } from '../../types/aiTypes';

class AiRateLimiter {
  // Store timestamps of requests per model: modelId -> number[]
  private minuteBuckets: Map<string, number[]> = new Map();
  // Store daily count: modelId -> { date: 'YYYY-MM-DD', count: number }
  private dailyCounts: Map<string, { date: string; count: number }> = new Map();

  public checkRateLimit(model: AiModelConfig): { allowed: boolean; retryAfterSec?: number; reason?: string } {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Check RPM
    if (model.maxRpm > 0) {
      const timestamps = this.minuteBuckets.get(model.id) || [];
      const oneMinuteAgo = now - 60_000;
      const recentTimestamps = timestamps.filter((t) => t > oneMinuteAgo);
      this.minuteBuckets.set(model.id, recentTimestamps);

      if (recentTimestamps.length >= model.maxRpm) {
        const oldest = recentTimestamps[0];
        const retryAfterSec = Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000));
        return {
          allowed: false,
          retryAfterSec,
          reason: `Limite de RPM atingido (${model.maxRpm} req/min). Tente novamente em ${retryAfterSec}s.`,
        };
      }
    }

    // Check RPD
    if (model.maxRpd > 0) {
      const dailyEntry = this.dailyCounts.get(model.id);
      if (dailyEntry && dailyEntry.date === today && dailyEntry.count >= model.maxRpd) {
        return {
          allowed: false,
          retryAfterSec: 3600,
          reason: `Daily limit (RPD) reached (${model.maxRpd} req/day) for this model.`,
        };
      }
    }

    return { allowed: true };
  }

  public recordRequest(modelId: string): void {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Record minute bucket
    const timestamps = this.minuteBuckets.get(modelId) || [];
    timestamps.push(now);
    this.minuteBuckets.set(modelId, timestamps);

    // Record daily count
    const dailyEntry = this.dailyCounts.get(modelId);
    if (!dailyEntry || dailyEntry.date !== today) {
      this.dailyCounts.set(modelId, { date: today, count: 1 });
    } else {
      dailyEntry.count += 1;
    }
  }

  public resetRateLimits(modelId?: string): void {
    if (modelId) {
      this.minuteBuckets.delete(modelId);
      this.dailyCounts.delete(modelId);
    } else {
      this.minuteBuckets.clear();
      this.dailyCounts.clear();
    }
  }
}

export const aiRateLimiter = new AiRateLimiter();
