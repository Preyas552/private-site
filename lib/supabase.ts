import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// These are inlined at build time (static export). The anon key is PUBLIC by
// design — the table is protected by Row-Level Security, not by hiding the key.
// .trim() guards against trailing newlines/spaces in dashboard-set env vars,
// which otherwise silently corrupt the URL or JWT.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Returns null when Supabase isn't configured, so callers can fall back to
// localStorage and the game keeps working when the self-hosted box is offline.
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
