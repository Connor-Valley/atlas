import { supabase } from "../lib/supabase.js";

const TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days — Census ACS updates annually
const mem = new Map<string, { data: unknown; ts: number }>();

export async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Layer 1: memory
  const hit = mem.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data as T;

  // Layer 2: Supabase (survives restarts)
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from("api_cache")
        .select("data, cached_at")
        .eq("key", key)
        .maybeSingle();

      if (row && Date.now() - new Date(row.cached_at).getTime() < TTL_MS) {
        mem.set(key, { data: row.data, ts: Date.now() });
        return row.data as T;
      }
    } catch {
      // Supabase unavailable — fall through to live fetch
    }
  }

  // Layer 3: live fetch, then populate both layers
  const fresh = await fetcher();
  mem.set(key, { data: fresh, ts: Date.now() });

  if (supabase) {
    supabase
      .from("api_cache")
      .upsert({ key, data: fresh as object, cached_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn(`[cache] write failed for "${key}":`, error.message);
      });
  }

  return fresh;
}
