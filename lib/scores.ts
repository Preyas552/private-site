import { supabase } from "@/lib/supabase";

export type BoardEntry = { name: string; score: number };

export const MAX_ENTRIES = 8;
const LOCAL_KEY = "pf_scores";
const MAX_NAME_LEN = 12;
// Matches the CHECK constraint on the Supabase table (see supabase/schema.sql).
const MAX_SCORE = 10000;

function sanitizeName(raw: string): string {
  return (raw.trim() || "anon").slice(0, MAX_NAME_LEN);
}

function clampScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, Math.round(raw)));
}

function sortBoard(entries: BoardEntry[]): BoardEntry[] {
  return [...entries].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}

// --- localStorage (fallback + always-on local cache) ---------------------

export function loadLocalBoard(): BoardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const board = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(board) ? board.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function saveLocalBoard(entries: BoardEntry[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// --- public API ----------------------------------------------------------

/**
 * Fetch the global top scores. Falls back to the local cache if Supabase is
 * unconfigured or unreachable.
 */
export async function fetchScores(): Promise<BoardEntry[]> {
  if (!supabase) return loadLocalBoard();
  try {
    const { data, error } = await supabase
      .from("scores")
      .select("name, score")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(MAX_ENTRIES);
    if (error || !data) return loadLocalBoard();
    return data as BoardEntry[];
  } catch {
    return loadLocalBoard();
  }
}

/**
 * Submit a score to the global board and return the refreshed top list.
 * Always updates the local cache first so the player's own best survives even
 * when the self-hosted database is offline.
 */
export async function submitScore(
  rawName: string,
  rawScore: number,
): Promise<BoardEntry[]> {
  const entry: BoardEntry = {
    name: sanitizeName(rawName),
    score: clampScore(rawScore),
  };

  const localNext = sortBoard([...loadLocalBoard(), entry]);
  saveLocalBoard(localNext);

  if (!supabase) return localNext;
  try {
    const { error } = await supabase.from("scores").insert(entry);
    if (error) return localNext;
    return await fetchScores();
  } catch {
    return localNext;
  }
}
