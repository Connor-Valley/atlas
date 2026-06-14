import { Redis } from "@upstash/redis";

const TTL_SECONDS = 15 * 24 * 60 * 60; // 15 days
const TTL_MS = TTL_SECONDS * 1000;
const mem = new Map<string, { data: unknown; ts: number }>();

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  _redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
      : null;
  return _redis;
}

export async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Layer 1: memory
  const hit = mem.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data as T;

  // Layer 2: Redis (survives restarts, auto-expires)
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null) {
        mem.set(key, { data: cached, ts: Date.now() });
        return cached;
      }
    } catch {
      // Redis unavailable — fall through to live fetch
    }
  }

  // Layer 3: live fetch, then populate both layers
  const fresh = await fetcher();
  mem.set(key, { data: fresh, ts: Date.now() });

  if (redis) {
    redis.set(key, fresh, { ex: TTL_SECONDS }).catch((e: Error) =>
      console.warn(`[cache] write failed for "${key}":`, e.message)
    );
  }

  return fresh;
}

export async function clearCache(
  prefix?: string
): Promise<{ memCleared: number; redisCleared: number | null }> {
  let memCleared = 0;
  if (prefix) {
    for (const key of mem.keys()) {
      if (key.startsWith(prefix)) {
        mem.delete(key);
        memCleared++;
      }
    }
  } else {
    memCleared = mem.size;
    mem.clear();
  }

  let redisCleared: number | null = null;
  const redis = getRedis();
  if (redis) {
    try {
      if (prefix) {
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length) {
          await redis.del(...keys);
          redisCleared = keys.length;
        } else {
          redisCleared = 0;
        }
      } else {
        await redis.flushdb();
        redisCleared = 0;
      }
    } catch {
      // Redis unavailable
    }
  }

  return { memCleared, redisCleared };
}
