"use client";

import {
  EXPERIENCE,
  PROJECTS,
  SKILLS,
  STAT_CHART_HEIGHTS,
  STAT_CHART_LABEL,
  STATS,
  WHOAMI,
  WRITING,
} from "@/lib/portfolio-data";
import DesktopWindow from "@/components/DesktopWindow";
import {
  ALL_WINDOW_IDS,
  computeCanvasSize,
  initialRects,
  loadSavedRects,
  MIN_WIN_H,
  MIN_WIN_W,
  saveRects,
  type WinId,
  type WinRect,
} from "@/lib/window-layout";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const CONFIG = {
  accent: "#e0742f",
  gameSeconds: 30,
  showStats: true,
} as const;

const DUR = Math.round(CONFIG.gameSeconds);

const ALL_ORDER = [...ALL_WINDOW_IDS] as WinId[];

type Mode = "desktop" | "mobile";
type Phase = "idle" | "playing" | "over";
type Target = { id: string; left: number; top: number; born: number; life: number };
type BoardEntry = { name: string; score: number };
type DragState = {
  id: WinId;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
};
type ResizeState = {
  id: WinId;
  sx: number;
  sy: number;
  ow: number;
  oh: number;
  axis: "se" | "e" | "s";
};

const ORDER: WinId[] = CONFIG.showStats
  ? [...ALL_ORDER]
  : ALL_ORDER.filter((id) => id !== "stats");

function initialZ(): Record<WinId, number> {
  const z = {} as Record<WinId, number>;
  ALL_ORDER.forEach((id, i) => {
    z[id] = i + 1;
  });
  return z;
}

function loadBoard(): BoardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const board = JSON.parse(localStorage.getItem("pf_scores") || "[]");
    return Array.isArray(board) ? board.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PortfolioShell() {
  const [mode, setMode] = useState<Mode>("desktop");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("--:--");
  const [rects, setRects] = useState<Record<WinId, WinRect>>(initialRects);
  const [z, setZ] = useState<Record<WinId, number>>(initialZ);
  const zCounter = useRef(ALL_ORDER.length + 1);
  const layoutReady = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(DUR);
  const [targets, setTargets] = useState<Target[]>([]);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [grabbingId, setGrabbingId] = useState<WinId | null>(null);
  const [resizingId, setResizingId] = useState<WinId | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const winRefs = useRef<Partial<Record<WinId, HTMLDivElement>>>({});
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const spawnAccRef = useRef(0);
  const rectsRef = useRef(rects);
  rectsRef.current = rects;

  const best = useCallback(
    () => (board.length ? Math.max(...board.map((b) => b.score)) : 0),
    [board],
  );

  const bringToFront = useCallback((id: WinId) => {
    const next = zCounter.current++;
    setZ((prev) => ({ ...prev, [id]: next }));
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const navTo = useCallback(
    (id: WinId) => {
      closeMenu();
      bringToFront(id);
      const sc = scrollRef.current;
      const el = winRefs.current[id];
      if (!sc || !el) return;
      if (mode === "desktop") {
        const r = rects[id];
        sc.scrollTo({
          top: Math.max(0, r.y - 16),
          left: Math.max(0, r.x - 24),
          behavior: "smooth",
        });
      } else {
        sc.scrollTo({ top: Math.max(0, el.offsetTop - 14), behavior: "smooth" });
      }
    },
    [bringToFront, closeMenu, mode, rects],
  );

  const canvasSize = useMemo(() => computeCanvasSize(rects, ORDER), [rects]);

  const canvasStyle: CSSProperties =
    mode === "desktop"
      ? {
          position: "relative",
          width: canvasSize.width,
          height: canvasSize.height,
          minWidth: "100%",
          margin: "24px auto 40px",
        }
      : {
          position: "relative",
          maxWidth: 620,
          padding: "16px 14px 40px",
          margin: "0 auto",
        };

  const resetLayout = useCallback(() => {
    const next = initialRects();
    setRects(next);
    saveRects(next);
  }, []);

  const onGrab = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: WinId) => {
      bringToFront(id);
      if (mode !== "desktop") return;
      const r = rectsRef.current[id];
      dragRef.current = {
        id,
        sx: e.clientX,
        sy: e.clientY,
        ox: r.x,
        oy: r.y,
      };
      setGrabbingId(id);
      document.body.style.cursor = "grabbing";
      e.preventDefault();
    },
    [bringToFront, mode],
  );

  const onResizeStart = useCallback(
    (
      e: ReactPointerEvent<HTMLDivElement>,
      id: WinId,
      axis: "se" | "e" | "s",
    ) => {
      bringToFront(id);
      if (mode !== "desktop") return;
      const r = rectsRef.current[id];
      resizeRef.current = {
        id,
        sx: e.clientX,
        sy: e.clientY,
        ow: r.w,
        oh: r.h,
        axis,
      };
      setResizingId(id);
      document.body.style.cursor =
        axis === "e" ? "ew-resize" : axis === "s" ? "ns-resize" : "nwse-resize";
      e.preventDefault();
      e.stopPropagation();
    },
    [bringToFront, mode],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const nx = Math.max(0, drag.ox + (e.clientX - drag.sx));
        const ny = Math.max(0, drag.oy + (e.clientY - drag.sy));
        setRects((prev) => ({
          ...prev,
          [drag.id]: { ...prev[drag.id], x: nx, y: ny },
        }));
        return;
      }

      const resize = resizeRef.current;
      if (!resize) return;
      const dx = e.clientX - resize.sx;
      const dy = e.clientY - resize.sy;
      const nw =
        resize.axis === "s"
          ? resize.ow
          : Math.max(MIN_WIN_W, resize.ow + dx);
      const nh =
        resize.axis === "e"
          ? resize.oh
          : Math.max(MIN_WIN_H, resize.oh + dy);
      setRects((prev) => ({
        ...prev,
        [resize.id]: { ...prev[resize.id], w: nw, h: nh },
      }));
    };

    const onUp = () => {
      let changed = false;
      if (dragRef.current) {
        dragRef.current = null;
        setGrabbingId(null);
        changed = true;
      }
      if (resizeRef.current) {
        resizeRef.current = null;
        setResizingId(null);
        changed = true;
      }
      if (changed) {
        document.body.style.cursor = "";
        if (layoutReady.current) saveRects(rectsRef.current);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useEffect(() => {
    const saved = loadSavedRects();
    if (saved) setRects(saved);
    layoutReady.current = true;
  }, []);

  useEffect(() => {
    setBoard(loadBoard());
  }, []);

  useEffect(() => {
    const applyMode = () => {
      const next = window.matchMedia("(max-width: 900px)").matches
        ? "mobile"
        : "desktop";
      setMode(next);
      if (next === "desktop") setMenuOpen(false);
    };
    applyMode();
    const mq = window.matchMedia("(max-width: 900px)");
    mq.addEventListener("change", applyMode);
    return () => mq.removeEventListener("change", applyMode);
  }, []);

  useEffect(() => {
    setClock(now());
    const id = setInterval(() => setClock(now()), 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        menuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("#menuToggle")
      ) {
        closeMenu();
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [closeMenu, menuOpen]);

  const startGame = useCallback(() => {
    setScore(0);
    setTime(DUR);
    setTargets([]);
    spawnAccRef.current = 0;
    setPlayerName("");
    setPhase("playing");
  }, []);

  const endGame = useCallback(
    (finalScore: number) => {
      setLastScore(finalScore);
      setPhase("over");
    },
    [],
  );

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTime((prevTime) => {
        const nextTime = +(prevTime - 0.1).toFixed(2);
        const t = Date.now();

        setTargets((prev) =>
          prev.filter((tg) => {
            const alive = t - tg.born < tg.life;
            return alive;
          }),
        );

        spawnAccRef.current += 0.1;
        const interval = nextTime > DUR * 0.5 ? 0.62 : 0.46;
        if (spawnAccRef.current >= interval) {
          spawnAccRef.current = 0;
          const tg: Target = {
            id: `${t}-${Math.random().toFixed(3)}`,
            left: 6 + Math.random() * 82,
            top: 8 + Math.random() * 78,
            born: t,
            life: 1150,
          };
          setTargets((prev) => [...prev, tg]);
        }

        if (nextTime <= 0) {
          clearInterval(timer);
          setTargets([]);
          setScore((s) => {
            endGame(s);
            return s;
          });
          return 0;
        }

        return nextTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [endGame, phase]);

  const hit = useCallback((id: string) => {
    setScore((s) => s + 1);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const submitScore = useCallback(() => {
    const name = (playerName.trim() || "anon").slice(0, 12);
    const next = [...board, { name, score: lastScore }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    setBoard(next);
    try {
      localStorage.setItem("pf_scores", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setPhase("idle");
  }, [board, lastScore, playerName]);

  const bst = best();
  const gameNote =
    lastScore >= bst && bst > 0 && lastScore > 0
      ? "new personal best!"
      : "add your name to the board";

  return (
    <div className="shell">
      <div className="menubar">
        <div className="brand">
          <i />preyas.dev
        </div>
        <div className={`nav-desktop${mode !== "desktop" ? " hidden" : ""}`}>
          <button type="button" onClick={() => navTo("projects")}>
            Work
          </button>
          <button type="button" onClick={() => navTo("writing")}>
            Writing
          </button>
          <button type="button" onClick={() => navTo("whoami")}>
            About
          </button>
          <button type="button" onClick={() => navTo("contact")}>
            Contact
          </button>
          <button type="button" className="play" onClick={() => navTo("game")}>
            &#9656; Play
          </button>
          {mode === "desktop" && (
            <button
              type="button"
              onClick={resetLayout}
              title="Reset window positions and sizes"
              style={{
                background: "none",
                border: "1px solid rgba(0,0,0,.14)",
                borderRadius: 6,
                padding: "4px 9px",
                cursor: "pointer",
                color: "var(--muted)",
                marginLeft: 4,
              }}
            >
              reset layout
            </button>
          )}
          <span className="clock">{clock}</span>
        </div>
        <button
          type="button"
          id="menuToggle"
          className={`menu-toggle${mode === "desktop" ? " hidden" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          menu &#9662;
        </button>
      </div>

      <div
        ref={dropdownRef}
        className={`dropdown${!menuOpen || mode === "desktop" ? " hidden" : ""}`}
      >
        <button type="button" onClick={() => navTo("whoami")}>
          whoami
        </button>
        <button type="button" onClick={() => navTo("projects")}>
          projects/
        </button>
        <button type="button" onClick={() => navTo("writing")}>
          writing/
        </button>
        <button type="button" className="game" onClick={() => navTo("game")}>
          &#9733; game.app
        </button>
        <button type="button" onClick={() => navTo("contact")}>
          contact
        </button>
      </div>

      <div className="scrollarea" ref={scrollRef}>
        <div id="canvas" style={canvasStyle}>
          {/* WHOAMI */}
          <DesktopWindow
            id="whoami"
            label="whoami — terminal"
            rect={rects.whoami}
            zIndex={z.whoami}
            mode={mode}
            isGrabbing={grabbingId === "whoami"}
            isResizing={resizingId === "whoami"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.whoami = el ?? undefined;
            }}
          >
            <div
              style={{
                padding: "22px 24px 24px",
                display: "flex",
                gap: 22,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  className="mono"
                  style={{ fontSize: 12.5, color: "var(--faint)", marginBottom: 10 }}
                >
                  $ whoami
                </div>
                <h1
                  style={{
                    margin: "0 0 4px",
                    fontSize: 38,
                    lineHeight: 1.02,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Preyas Patel
                  <span
                    style={{
                      display: "inline-block",
                      width: 11,
                      height: 34,
                      background: "var(--ink)",
                      marginLeft: 6,
                      verticalAlign: -4,
                      animation: "blink 1.1s steps(1) infinite",
                    }}
                  />
                </h1>
                <div
                  className="mono accent-text"
                  style={{ fontSize: 14, marginBottom: 16, fontWeight: 500 }}
                >
                  {WHOAMI.tagline}
                </div>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "#4a463f",
                    maxWidth: 440,
                  }}
                >
                  {WHOAMI.bio}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  <button
                    type="button"
                    onClick={() => navTo("projects")}
                    style={{
                      background: "var(--ink)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    View work
                  </button>
                  <button
                    type="button"
                    onClick={() => navTo("resume")}
                    style={{
                      background: "#fff",
                      color: "var(--ink)",
                      border: "1px solid rgba(0,0,0,.18)",
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    résumé.pdf
                  </button>
                  <button
                    type="button"
                    onClick={() => navTo("game")}
                    style={{
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      border: "none",
                      color: "#fff",
                      background: "var(--accent)",
                    }}
                  >
                    &#9656; Play the game
                  </button>
                </div>
              </div>
              <div
                className="mono placeholder-fill"
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 16,
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: 10,
                  color: "var(--faint)",
                  border: "1px solid rgba(0,0,0,.1)",
                }}
              >
                your
                <br />
                photo
              </div>
            </div>
          </DesktopWindow>

          {/* STATS */}
          {CONFIG.showStats && (
            <DesktopWindow
              id="stats"
              label="stats — overview"
              rect={rects.stats}
              zIndex={z.stats}
              mode={mode}
              isGrabbing={grabbingId === "stats"}
              isResizing={resizingId === "stats"}
              onTitlePointerDown={onGrab}
              onResizePointerDown={onResizeStart}
              setRef={(el) => {
                winRefs.current.stats = el ?? undefined;
              }}
            >
              <div style={{ padding: "18px 20px 20px" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {STATS.map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        flex: 1,
                        border: "1px solid rgba(0,0,0,.09)",
                        borderRadius: 10,
                        padding: "12px 10px",
                        textAlign: "center",
                        background: "#fcfbf8",
                      }}
                    >
                      <div
                        className={"accent" in stat && stat.accent ? "accent-text" : undefined}
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {stat.val}
                        {stat.sub && (
                          <span style={{ fontSize: 15, color: "var(--faint)" }}>
                            {stat.sub}
                          </span>
                        )}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 10, color: "var(--faint)", marginTop: 3 }}
                      >
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--faint)", marginBottom: 9 }}
                >
                  {STAT_CHART_LABEL}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 60,
                  }}
                >
                  {STAT_CHART_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        borderRadius: "3px 3px 0 0",
                        background: i === 4 ? "var(--accent)" : "#e3e0d8",
                      }}
                    />
                  ))}
                </div>
              </div>
            </DesktopWindow>
          )}

          {/* PROJECTS */}
          <DesktopWindow
            id="projects"
            label="projects/"
            rect={rects.projects}
            zIndex={z.projects}
            mode={mode}
            isGrabbing={grabbingId === "projects"}
            isResizing={resizingId === "projects"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.projects = el ?? undefined;
            }}
          >
            <div
              style={{
                padding: "18px 20px 20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              {PROJECTS.map((p) => (
                <div
                  key={p.name}
                  style={{
                    border: "1px solid rgba(0,0,0,.09)",
                    borderRadius: 11,
                    overflow: "hidden",
                    background: "#fcfbf8",
                  }}
                >
                  <div
                    className="mono placeholder-fill"
                    style={{
                      height: 64,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: "var(--faint)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {p.category ?? "project"}
                  </div>
                  <div style={{ padding: "11px 12px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.45,
                        marginBottom: 9,
                      }}
                    >
                      {p.desc}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {p.tags.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DesktopWindow>

          {/* GAME */}
          <DesktopWindow
            id="game"
            label={<>&#9733; game.app</>}
            className="win game-win"
            rect={rects.game}
            zIndex={z.game}
            mode={mode}
            isGrabbing={grabbingId === "game"}
            isResizing={resizingId === "game"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.game = el ?? undefined;
            }}
          >
            <div
              style={{
                padding: "16px 18px 18px",
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 230 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 9,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    Catch the semicolons
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                    score{" "}
                    <b style={{ color: "var(--ink)" }}>{score}</b> ·{" "}
                    <span>{phase === "playing" ? time.toFixed(1) : DUR}s</span>
                  </div>
                </div>
                <div
                  id="arena"
                  style={{
                    position: "relative",
                    height: 260,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#15140f",
                    backgroundImage:
                      "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                    border: "1px solid rgba(0,0,0,.25)",
                  }}
                >
                  {targets.map((tg) => (
                    <button
                      key={tg.id}
                      type="button"
                      className="game-target"
                      style={{ left: `${tg.left}%`, top: `${tg.top}%` }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => hit(tg.id)}
                    >
                      ;
                    </button>
                  ))}

                  {phase === "idle" && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: 20,
                        background: "rgba(21,20,15,.55)",
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: "#b8b2a4",
                          maxWidth: 240,
                          lineHeight: 1.5,
                          marginBottom: 16,
                        }}
                      >
                        Tap the falling <b className="accent-text">;</b> tokens
                        before they vanish. {DUR} seconds on the clock.
                      </div>
                      <button
                        type="button"
                        onClick={startGame}
                        style={{
                          border: "none",
                          borderRadius: 9,
                          padding: "12px 24px",
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer",
                          color: "#fff",
                          background: "var(--accent)",
                        }}
                      >
                        &#9656; Start
                      </button>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: "#7d786c", marginTop: 14 }}
                      >
                        your best · {bst > 0 ? `${bst} pts` : "—"}
                      </div>
                    </div>
                  )}

                  {phase === "over" && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: 20,
                        background: "rgba(21,20,15,.78)",
                      }}
                    >
                      <div className="mono" style={{ fontSize: 12, color: "#b8b2a4" }}>
                        time!
                      </div>
                      <div
                        style={{
                          fontSize: 40,
                          fontWeight: 700,
                          color: "#fff",
                          margin: "2px 0",
                        }}
                      >
                        {lastScore}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: "var(--faint)",
                          marginBottom: 14,
                        }}
                      >
                        {gameNote}
                      </div>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input
                          id="g-name"
                          maxLength={12}
                          placeholder="your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitScore();
                          }}
                          style={{
                            width: 120,
                            background: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.25)",
                            color: "#fff",
                            borderRadius: 8,
                            padding: "9px 11px",
                            fontSize: 13,
                            outline: "none",
                          }}
                        />
                        <button
                          type="button"
                          onClick={submitScore}
                          style={{
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 14px",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            color: "#fff",
                            background: "var(--accent)",
                          }}
                        >
                          Save
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={startGame}
                        style={{
                          marginTop: 11,
                          background: "none",
                          border: "1px solid rgba(255,255,255,.3)",
                          color: "#e9e6df",
                          borderRadius: 8,
                          padding: "7px 14px",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Play again
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  width: 170,
                  flex: "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="mono accent-text"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  &#9733; high scores
                </div>
                {board.length > 0 ? (
                  board.map((row, i) => (
                    <div
                      key={`${row.name}-${row.score}-${i}`}
                      className="mono"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 12,
                        padding: "6px 9px",
                        borderRadius: 7,
                        color: "#3a372f",
                        background:
                          i === 0
                            ? `color-mix(in srgb, ${CONFIG.accent} 15%, transparent)`
                            : i % 2
                              ? "transparent"
                              : "rgba(0,0,0,.035)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--faint)",
                          width: 18,
                          display: "inline-block",
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>{row.score}</span>
                    </div>
                  ))
                ) : (
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--faint)",
                      lineHeight: 1.6,
                      border: "1px dashed rgba(0,0,0,.16)",
                      borderRadius: 9,
                      padding: 14,
                      textAlign: "center",
                    }}
                  >
                    No scores yet.
                    <br />
                    Be the first &#8593;
                  </div>
                )}
              </div>
            </div>
          </DesktopWindow>

          {/* WRITING */}
          <DesktopWindow
            id="writing"
            label="writing/"
            rect={rects.writing}
            zIndex={z.writing}
            mode={mode}
            isGrabbing={grabbingId === "writing"}
            isResizing={resizingId === "writing"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.writing = el ?? undefined;
            }}
          >
            <div style={{ padding: "8px 18px 16px" }}>
              {WRITING.map((post, i, arr) => (
                <div
                  key={post.title}
                  style={{
                    display: "flex",
                    gap: 11,
                    alignItems: "baseline",
                    padding: "12px 0",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid rgba(0,0,0,.07)"
                        : undefined,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--faint)",
                      flex: "none",
                      width: 54,
                    }}
                  >
                    {post.date}
                  </span>
                  <div>
                    <div
                      style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}
                    >
                      {post.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--faint)",
                        marginTop: 2,
                      }}
                    >
                      {post.read}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DesktopWindow>

          {/* RESUME */}
          <DesktopWindow
            id="resume"
            label="resume"
            rect={rects.resume}
            zIndex={z.resume}
            mode={mode}
            isGrabbing={grabbingId === "resume"}
            isResizing={resizingId === "resume"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.resume = el ?? undefined;
            }}
          >
            <div style={{ padding: "16px 18px 18px" }}>
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}
              >
                experience
              </div>
              {EXPERIENCE.map((job, i) => (
                <div
                  key={job.role}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: i === 0 ? 6 : 16,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{job.role}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{job.org}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3, lineHeight: 1.4 }}>
                      {job.detail}
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--faint)",
                      whiteSpace: "nowrap",
                      flex: "none",
                    }}
                  >
                    {job.when}
                  </div>
                </div>
              ))}
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 9,
                }}
              >
                skills
              </div>
              <div
                style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}
              >
                {SKILLS.map((skill) => (
                  <span
                    key={skill}
                    className="chip"
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <button
                type="button"
                style={{
                  width: "100%",
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Download résumé &#8595;
              </button>
            </div>
          </DesktopWindow>

          {/* CONTACT */}
          <DesktopWindow
            id="contact"
            label="contact"
            rect={rects.contact}
            zIndex={z.contact}
            mode={mode}
            isGrabbing={grabbingId === "contact"}
            isResizing={resizingId === "contact"}
            onTitlePointerDown={onGrab}
            onResizePointerDown={onResizeStart}
            setRef={(el) => {
              winRefs.current.contact = el ?? undefined;
            }}
          >
            <div
              style={{
                padding: 20,
                display: "flex",
                gap: 18,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    marginBottom: 5,
                  }}
                >
                  Let&apos;s build something.
                </div>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 13.5,
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Open to roles and interesting collaborations. Fastest way to
                  reach me is email.
                </p>
                <a
                  href="mailto:preyas.patel@outlook.com"
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "11px 18px",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  preyas.patel@outlook.com
                </a>
              </div>
              <div
                className="mono"
                style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}
              >
                {["github", "linkedin", "x / twitter"].map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      color: "var(--ink)",
                      textDecoration: "none",
                      border: "1px solid rgba(0,0,0,.14)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      minWidth: 120,
                    }}
                  >
                    &#8594; {link}
                  </a>
                ))}
              </div>
            </div>
          </DesktopWindow>
        </div>
      </div>

      <div className="dock">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={id === "game" ? "game" : undefined}
            onClick={() => navTo(id)}
          >
            {id === "game" ? "\u2605 game" : id}
          </button>
        ))}
      </div>
    </div>
  );
}
