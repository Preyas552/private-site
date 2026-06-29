"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { WinId, WinRect } from "@/lib/window-layout";

type Mode = "desktop" | "mobile";

type DesktopWindowProps = {
  id: WinId;
  label: ReactNode;
  className?: string;
  rect: WinRect;
  zIndex: number;
  mode: Mode;
  isGrabbing: boolean;
  isResizing: boolean;
  onTitlePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: WinId) => void;
  onResizePointerDown: (
    e: ReactPointerEvent<HTMLDivElement>,
    id: WinId,
    axis: "se" | "e" | "s",
  ) => void;
  setRef: (el: HTMLDivElement | null) => void;
  children: ReactNode;
};

function TitleDots() {
  return (
    <>
      <span className="dot" style={{ background: "#ff5f57" }} />
      <span className="dot" style={{ background: "#febc2e" }} />
      <span className="dot" style={{ background: "#28c840" }} />
    </>
  );
}

export default function DesktopWindow({
  id,
  label,
  className = "win",
  rect,
  zIndex,
  mode,
  isGrabbing,
  isResizing,
  onTitlePointerDown,
  onResizePointerDown,
  setRef,
  children,
}: DesktopWindowProps) {
  const shellStyle: CSSProperties =
    mode === "desktop"
      ? {
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          zIndex,
          display: "flex",
          flexDirection: "column",
        }
      : {
          position: "relative",
          width: "100%",
          marginBottom: 16,
          zIndex: 1,
        };

  return (
    <div id={`win-${id}`} className={className} ref={setRef} style={shellStyle}>
      <div
        className={`titlebar${isGrabbing ? " grabbing" : ""}`}
        onPointerDown={(e) => onTitlePointerDown(e, id)}
      >
        <TitleDots />
        <span className="label">{label}</span>
      </div>
      <div className="win-body">{children}</div>
      {mode === "desktop" && (
        <>
          <div
            className="resize-edge resize-edge-e"
            onPointerDown={(e) => onResizePointerDown(e, id, "e")}
            aria-hidden
          />
          <div
            className="resize-edge resize-edge-s"
            onPointerDown={(e) => onResizePointerDown(e, id, "s")}
            aria-hidden
          />
          <div
            className={`resize-handle${isResizing ? " resizing" : ""}`}
            onPointerDown={(e) => onResizePointerDown(e, id, "se")}
            aria-label="Resize window"
          />
        </>
      )}
    </div>
  );
}
