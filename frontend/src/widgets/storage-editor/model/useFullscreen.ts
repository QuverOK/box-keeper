import { useCallback, useEffect, useRef, useState } from "react";
const MOBILE_QUERY = "(max-width: 639px)";
interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}
export function useFullscreen(): UseFullscreenResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);
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
          el.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);
  return { isFullscreen, toggle, containerRef };
}
