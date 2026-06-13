import { cn } from "@/shared/lib/cn";

export interface BoxHighlightState {
  isDragging?: boolean;
  isSearchMatch?: boolean;
  isSearchHighlight?: boolean;
  isFocused?: boolean;
  isStackExpanded?: boolean;
}

/** Single highlight style — priority: drag > searchMatch > searchHighlight > focused > stack */
export function getBoxHighlightClass(state: BoxHighlightState): string {
  const {
    isDragging,
    isSearchMatch,
    isSearchHighlight,
    isFocused,
    isStackExpanded,
  } = state;

  if (isDragging) return "outline outline-2 outline-blue-500 outline-offset-0";
  if (isSearchMatch)
    return "outline outline-2 outline-primary outline-offset-0";
  if (isSearchHighlight)
    return "outline outline-2 outline-amber-500 outline-offset-0";
  if (isFocused) return "outline outline-2 outline-violet-500 outline-offset-0";
  if (isStackExpanded)
    return "outline outline-2 outline-gray-600 outline-offset-0 shadow-md";
  return "";
}

export function boxHighlightCn(state: BoxHighlightState): string {
  return cn(getBoxHighlightClass(state));
}
