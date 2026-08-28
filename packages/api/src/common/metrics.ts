import { getRedis } from "./cache.js";

// Lightweight daily call counters for external APIs we don't control the rate limits on.
// Best-effort only — a missed increment (Redis blip) just under-counts by a little, it should
// never block or slow down the actual request.

const mem = new Map<string, number>();

function todayKey(prefix: string): string {
  const day = new Date().toISOString().slice(0, 10); // UTC date
  return `metrics:${prefix}:${day}`;
}

export async function trackCall(prefix: string): Promise<void> {
  const key = todayKey(prefix);
  mem.set(key, (mem.get(key) ?? 0) + 1);

  const redis = getRedis();
  if (!redis) return;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3 * 24 * 60 * 60); // a few days of buffer, these are cheap to keep
    }
  } catch {
    // best-effort only — in-memory counter above still covers this process's own view
  }
}

export async function getCallCount(prefix: string, date?: string): Promise<number> {
  const key = `metrics:${prefix}:${date ?? new Date().toISOString().slice(0, 10)}`;
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get<number>(key);
      if (val != null) return Number(val);
    } catch {
      // fall through to in-memory
    }
  }
  return mem.get(key) ?? 0;
}
