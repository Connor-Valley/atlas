import { Redis } from "@upstash/redis";

const TTL_SECONDS = 15 * 24 * 60 * 60; // 15 days
const TTL_MS = TTL_SECONDS * 1000;
const mem = new Map<string, { data: unknown; ts: number }>();

// Bump this whenever a change alters what a cached response computes or contains (new/renamed
// fields, fixed calculation, different data source) — old entries under the previous version
// become unreachable immediately (never read again) and just expire on their own via Redis's
// TTL, rather than silently serving stale-but-well-formed data to real users for up to 15 days
// until someone remembers to manually clear the right cache prefix.
const CACHE_VERSION = 1;

function versionedKey(key: string): string {
  return `v${CACHE_VERSION}:${key}`;
}

let _redis: Redis | null | undefined;
export function getRedis(): Redis | null {
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

export async function getCached<T>(
  rawKey: string,
  fetcher: () => Promise<T>,
  opts?: { shouldCache?: (result: T) => boolean }
): Promise<T> {
  const key = versionedKey(rawKey);

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
  const shouldCache = opts?.shouldCache ?? (() => true);

  if (shouldCache(fresh)) {
    mem.set(key, { data: fresh, ts: Date.now() });
    if (redis) {
      redis.set(key, fresh, { ex: TTL_SECONDS }).catch((e: Error) =>
        console.warn('[cache] write failed for "%s": %s', key, e.message)
      );
    }
  }

  return fresh;
}

export async function clearCache(
  prefix?: string
): Promise<{ memCleared: number; redisCleared: number | null }> {
  const versionedPrefix = prefix ? versionedKey(prefix) : undefined;

  let memCleared = 0;
  if (versionedPrefix) {
    for (const key of mem.keys()) {
      if (key.startsWith(versionedPrefix)) {
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
      if (versionedPrefix) {
        const keys = await redis.keys(`${versionedPrefix}*`);
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
