export const MIN_VIEWPORT_WIDTH = 300;
export const NARROW_BREAKPOINT = 400;
export function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}
export function computeTargetFeaturePx(viewportW: number): number {
    if (viewportW <= 0)
        return 120;
    return clamp(viewportW * 0.4, 48, 120);
}
export function computeCanvasPad(viewportW: number): number {
    if (viewportW <= 0)
        return 96;
    return clamp(viewportW * 0.12, 16, 96);
}
export function computeCanvasHeightCss(viewportW: number): string {
    const minH = viewportW <= 360 ? 220 : 280;
    return `clamp(${minH}px, 50dvh, 640px)`;
}
