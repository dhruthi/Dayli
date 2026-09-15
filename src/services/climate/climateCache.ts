import { NormalizedClimateData } from './types';

interface CacheItem {
  data: NormalizedClimateData;
  timestampMs: number;
}

export class ClimateCache {
  private cache = new Map<string, CacheItem>();
  private defaultTtlMs = 10 * 60 * 1000; // 10 minutes

  private makeKey(lat: number, lon: number): string {
    return `${lat.toFixed(3)}_${lon.toFixed(3)}`;
  }

  get(lat: number, lon: number, ttlMs: number = this.defaultTtlMs): NormalizedClimateData | null {
    const key = this.makeKey(lat, lon);
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestampMs;
    if (age > ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(lat: number, lon: number, data: NormalizedClimateData): void {
    const key = this.makeKey(lat, lon);
    this.cache.set(key, {
      data,
      timestampMs: Date.now(),
    });
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const climateCache = new ClimateCache();
