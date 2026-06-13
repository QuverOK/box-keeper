import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_WIDTH_QUERY = "(max-width: 639px)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(MOBILE_WIDTH_QUERY).matches ||
    window.matchMedia(COARSE_POINTER_QUERY).matches
  );
}

function getFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const target = el as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }
  if (target.webkitRequestFullscreen) {
    target.webkitRequestFullscreen();
  }
}

async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => void;
  };
  if (doc.exitFullscreen) {
    await doc.exitFullscreen();
    return;
  }
  if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen();
  }
}

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useFullscreen(): UseFullscreenResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wantsNativeRef = useRef(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // Native Fullscreen API после mount fullscreen-контейнера (fixed overlay).
  useEffect(() => {
    if (!isFullscreen || !wantsNativeRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    requestElementFullscreen(el).catch(() => {
      if (!cancelled) wantsNativeRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) return;
    if (!getFullscreenElement()) return;
    exitDocumentFullscreen().catch(() => {});
    wantsNativeRef.current = false;
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !getFullscreenElement()) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const onChange = () => {
      if (!getFullscreenElement()) {
        wantsNativeRef.current = false;
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggle = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      wantsNativeRef.current = next && isMobileViewport();
      return next;
    });
  }, []);

  return { isFullscreen, toggle, containerRef };
}
