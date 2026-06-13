/** Transparent 1×1 pixel data URI — used to suppress the browser's default drag preview. */
const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let cachedImage: HTMLImageElement | null = null;

/**
 * Returns a singleton 1×1 transparent image suitable for `dataTransfer.setDragImage`.
 * Call only in browser context (inside event handlers).
 */
export function getTransparentDragImage(): HTMLImageElement {
  if (!cachedImage) {
    cachedImage = new Image();
    cachedImage.src = TRANSPARENT_PNG;
  }
  return cachedImage;
}
