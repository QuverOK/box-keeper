import { useCallback, useEffect, useRef, useState } from "react";
import { clampZoom } from "./viewportZoom";

export interface ViewportFrame {
  zoom: number;
  x: number;
  y: number;
}

export function framesEqual(a: ViewportFrame, b: ViewportFrame): boolean {
  return a.zoom === b.zoom && a.x === b.x && a.y === b.y;
}

export function useViewportFrame(zoomMax: number) {
  const [frame, setFrame] = useState<ViewportFrame>({ zoom: 1, x: 0, y: 0 });
  const frameRef = useRef<ViewportFrame>({ zoom: 1, x: 0, y: 0 });
  const pendingRef = useRef<ViewportFrame | null>(null);
  const rafRef = useRef<number | null>(null);

  const cancelScheduled = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const commitFrame = useCallback(
    (next: ViewportFrame, immediate = false) => {
      const committed: ViewportFrame = {
        zoom: clampZoom(next.zoom, zoomMax),
        x: next.x,
        y: next.y,
      };
      frameRef.current = committed;
      pendingRef.current = committed;

      if (immediate) {
        cancelScheduled();
        pendingRef.current = null;
        setFrame((prev) => (framesEqual(prev, committed) ? prev : committed));
        return;
      }

      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        setFrame((prev) =>
          pending && !framesEqual(prev, pending) ? pending : prev,
        );
      });
    },
    [cancelScheduled, zoomMax],
  );

  const flushFrame = useCallback(() => {
    const pending = pendingRef.current ?? frameRef.current;
    commitFrame(pending, true);
  }, [commitFrame]);

  useEffect(() => () => cancelScheduled(), [cancelScheduled]);

  return { frame, frameRef, commitFrame, flushFrame };
}
