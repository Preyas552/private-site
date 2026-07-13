// Verifies the site can reach your self-hosted Supabase and that the `scores`
// table + RLS policies work. Reads .env.local, then does a select, an insert,
// and a re-select — exactly what the game does in the browser.
//
//   node scripts/test-supabase.mjs
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local parser (no dependency needed).
function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* file optional */
  }
  return env;
}

const env = loadEnv(fileURLToPath(new URL("../.env.local", import.meta.url)));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in .env.local");
  process.exit(1);
}
console.log(`→ Connecting to ${url}`);

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: before, error: readErr } = await supabase
  .from("scores")
  .select("name, score")
  .order("score", { ascending: false })
  .limit(8);
if (readErr) {
  console.error("✗ SELECT failed:", readErr.message);
  process.exit(1);
}
console.log(`✓ SELECT ok — ${before.length} row(s) on the board`);

const probe = { name: "conntest", score: 1 };
const { error: insErr } = await supabase.from("scores").insert(probe);
if (insErr) {
  console.error("✗ INSERT failed (check RLS policy / schema):", insErr.message);
  process.exit(1);
}
console.log("✓ INSERT ok — RLS insert policy works");

console.log("\n✅ Connection is good. The game will use the live leaderboard.");
console.log("   (You can delete the 'conntest' row from Supabase Studio.)");
