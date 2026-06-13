import { memo } from "react";
import { cn } from "@/shared/lib/cn";

interface BoxFocusOverlayProps {
  boxId: string | null;
  boxX: number;
  boxY: number;
  boxW: number;
  boxD: number;
  roomWcm: number;
  roomHcm: number;
  visible: boolean;
}

export const BoxFocusOverlay = memo(function BoxFocusOverlay({
  boxId,
  boxX,
  boxY,
  boxW,
  boxD,
  roomWcm,
  roomHcm,
  visible,
}: BoxFocusOverlayProps) {
  if (!visible || !boxId) return null;

  return (
    <div
      className={cn(
        "absolute pointer-events-none z-35 rounded-md",
        "outline-2 outline-violet-500 outline-offset-0",
      )}
      style={{
        left: `${(boxX / roomWcm) * 100}%`,
        top: `${(boxY / roomHcm) * 100}%`,
        width: `${(boxW / roomWcm) * 100}%`,
        height: `${(boxD / roomHcm) * 100}%`,
      }}
      aria-hidden
    />
  );
});
