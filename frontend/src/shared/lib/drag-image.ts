const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
let cachedImage: HTMLImageElement | null = null;
export function getTransparentDragImage(): HTMLImageElement {
  if (!cachedImage) {
    cachedImage = new Image();
    cachedImage.src = TRANSPARENT_PNG;
  }
  return cachedImage;
}
