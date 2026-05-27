import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null | undefined = undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key ? createClient(url, key) : null;
  if (_client) console.log("[supabase] client initialized ✓");
  else console.warn("[supabase] client NOT initialized — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  return _client;
}
