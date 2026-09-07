import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";

import type { ViewMode } from "../types";
import "./SplitPane.css";

interface SplitPaneProps {
  mode: ViewMode;
  ratio: number;
  onRatioChange: (ratio: number) => void;
  first: ReactNode;
  /** Omitted until the preview has been shown at least once, to keep it out of the initial bundle load. */
  second?: ReactNode;
}

const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;

// Both panes stay mounted across mode changes (hidden via CSS, not unmounted) so the
// CodeMirror instance in `first` never gets torn down just from toggling view mode.
export function SplitPane({ mode, ratio, onRatioChange, first, second }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSplit = mode === "split-side-by-side" || mode === "split-stacked";
  const orientation: "side-by-side" | "stacked" = mode === "split-stacked" ? "stacked" : "side-by-side";
  const firstVisible = mode !== "preview";
  const secondVisible = mode !== "code";

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const divider = event.currentTarget;
      divider.setPointerCapture(event.pointerId);

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const next =
          orientation === "side-by-side"
            ? (moveEvent.clientX - rect.left) / rect.width
            : (moveEvent.clientY - rect.top) / rect.height;
        onRatioChange(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
      };
      const handleUp = () => {
        divider.releasePointerCapture(event.pointerId);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [orientation, onRatioChange],
  );

  const firstStyle: CSSProperties | undefined = isSplit
    ? {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: `${ratio * 100}%`,
      }
    : undefined;

  return (
    <div ref={containerRef} className={`split-pane split-pane-${orientation}`}>
      <div className="split-pane-first" hidden={!firstVisible} style={firstStyle}>
        {first}
      </div>
      {isSplit && (
        <div
          className="split-pane-divider"
          onPointerDown={handlePointerDown}
          role="separator"
          aria-orientation={orientation === "side-by-side" ? "vertical" : "horizontal"}
        />
      )}
      {second != null && (
        <div className="split-pane-second" hidden={!secondVisible}>
          {second}
        </div>
      )}
    </div>
  );
}
