export const ALL_WINDOW_IDS = [
  "whoami",
  "stats",
  "projects",
  "game",
  "writing",
  "resume",
  "contact",
] as const;

export type WinId = (typeof ALL_WINDOW_IDS)[number];

export type WinRect = { x: number; y: number; w: number; h: number };

export const MIN_WIN_W = 220;
export const MIN_WIN_H = 140;

export const DEFAULT_LAYOUT: Record<WinId, WinRect> = {
  whoami: { x: 40, y: 32, w: 560, h: 300 },
  stats: { x: 632, y: 32, w: 520, h: 280 },
  projects: { x: 40, y: 350, w: 560, h: 400 },
  game: { x: 632, y: 330, w: 520, h: 420 },
  writing: { x: 40, y: 770, w: 300, h: 220 },
  resume: { x: 360, y: 770, w: 300, h: 300 },
  contact: { x: 680, y: 770, w: 480, h: 240 },
};

const STORAGE_KEY = "pf_layout_v1";

export function initialRects(): Record<WinId, WinRect> {
  const rects = {} as Record<WinId, WinRect>;
  for (const id of ALL_WINDOW_IDS) {
    rects[id] = { ...DEFAULT_LAYOUT[id] };
  }
  return rects;
}

export function loadSavedRects(): Record<WinId, WinRect> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<WinId, WinRect>>;
    const rects = initialRects();
    for (const id of ALL_WINDOW_IDS) {
      const saved = parsed[id];
      if (!saved) continue;
      rects[id] = {
        x: Number(saved.x) || rects[id].x,
        y: Number(saved.y) || rects[id].y,
        w: Math.max(MIN_WIN_W, Number(saved.w) || rects[id].w),
        h: Math.max(MIN_WIN_H, Number(saved.h) || rects[id].h),
      };
    }
    return rects;
  } catch {
    return null;
  }
}

export function saveRects(rects: Record<WinId, WinRect>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rects));
  } catch {
    /* ignore */
  }
}

export function computeCanvasSize(
  rects: Record<WinId, WinRect>,
  visibleIds: WinId[],
): { width: number; height: number } {
  let width = 900;
  let height = 700;
  for (const id of visibleIds) {
    const r = rects[id];
    if (!r) continue;
    width = Math.max(width, r.x + r.w + 56);
    height = Math.max(height, r.y + r.h + 56);
  }
  return { width, height };
}
