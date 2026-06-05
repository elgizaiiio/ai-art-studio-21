import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let _client: SupabaseClient<any> | null = null;

export function getAdmin(): SupabaseClient<any> {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_admin_not_configured");
  _client = createClient<Database>(url, key, { auth: { persistSession: false } }) as SupabaseClient<any>;
  return _client;
}