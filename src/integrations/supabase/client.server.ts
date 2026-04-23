// Server-side Supabase admin client — bypasses RLS.
// Use only for trusted server-side operations (API routes, server functions).
// For user-authenticated queries (with RLS), use auth-middleware.ts instead.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// VITE_SUPABASE_URL is embedded at build time and available in the SSR bundle.
// SUPABASE_SERVICE_ROLE_KEY is a runtime-only secret — never expose to the client.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isAdminConfigured = Boolean(
  SUPABASE_URL && SUPABASE_URL.startsWith("https://") && SUPABASE_SERVICE_ROLE_KEY,
);

function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Import: import { supabaseAdmin } from "@/integrations/supabase/client.server";
// SECURITY: Never import this in client-side code. Service role key bypasses all RLS.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
