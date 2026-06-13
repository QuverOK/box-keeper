import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_QUERY = "(max-width: 639px)";

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Fullscreen for the storage visualization.
 *
 * Desktop: a fixed overlay that stretches across the page (not the OS screen).
 * Mobile: the same overlay plus the native Fullscreen API to hide browser chrome.
 */
export function useFullscreen(): UseFullscreenResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock background scroll while the overlay is active.
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // Exit on Escape (desktop overlay; native fullscreen handles its own Escape).
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  // Keep state in sync when the user leaves native fullscreen (mobile back/gesture).
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      const el = containerRef.current;
      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia(MOBILE_QUERY).matches;

      if (next) {
        if (isMobile && el?.requestFullscreen) {
          el.requestFullscreen().catch(() => {
            /* overlay still applies even if native fullscreen is denied */
          });
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          /* ignore */
        });
      }

      return next;
    });
  }, []);

  return { isFullscreen, toggle, containerRef };
}
