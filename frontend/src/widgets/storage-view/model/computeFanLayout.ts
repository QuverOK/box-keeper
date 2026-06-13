import type { BoxStack } from "@/features/box-drag";
export const FAN_GAP_PCT = 1.2;
const FAN_MAX_WIDTH_PCT = 95;
const NARROW_FAN_VIEWPORT = 360;
export interface FanPosition {
    leftPct: number;
    topPct: number;
}
function clampFanPosition(leftPct: number, topPct: number, widthPct: number, heightPct: number): FanPosition {
    return {
        leftPct: Math.max(0, Math.min(leftPct, 100 - widthPct)),
        topPct: Math.max(0, Math.min(topPct, 100 - heightPct)),
    };
}
export function computeFanLayout(params: {
    stack: BoxStack;
    roomWcm: number;
    roomHcm: number;
    viewportW: number;
}): Map<string, FanPosition> {
    const { stack, roomWcm, roomHcm, viewportW } = params;
    const items = stack.boxes;
    const layout = new Map<string, FanPosition>();
    if (items.length === 0)
        return layout;
    const widthsPct = items.map((b) => (b.sizeW / roomWcm) * 100);
    const heightsPct = items.map((b) => (b.sizeD / roomHcm) * 100);
    const totalWpct = widthsPct.reduce((a, b) => a + b, 0) + FAN_GAP_PCT * (items.length - 1);
    const maxHpct = Math.max(...heightsPct);
    const anchor = items[items.length - 1];
    const anchorLeftPct = (anchor.x / roomWcm) * 100;
    const anchorTopPct = (anchor.y / roomHcm) * 100;
    const useVertical = viewportW <= NARROW_FAN_VIEWPORT || totalWpct > FAN_MAX_WIDTH_PCT;
    if (!useVertical) {
        const centerXpct = ((anchor.x + anchor.sizeW / 2) / roomWcm) * 100;
        let startX = centerXpct - totalWpct / 2;
        startX = Math.max(0, Math.min(startX, Math.max(0, 100 - totalWpct)));
        let topPct = anchorTopPct;
        topPct = Math.max(0, Math.min(topPct, Math.max(0, 100 - maxHpct)));
        let run = startX;
        items.forEach((b, i) => {
            layout.set(b.id, clampFanPosition(run, topPct, widthsPct[i], heightsPct[i]));
            run += widthsPct[i] + FAN_GAP_PCT;
        });
        return layout;
    }
    const anchorWidthPct = widthsPct[items.length - 1];
    let leftPct = anchorLeftPct + anchorWidthPct / 2;
    const maxWidthPct = Math.max(...widthsPct);
    leftPct = Math.max(maxWidthPct / 2, Math.min(leftPct, 100 - maxWidthPct / 2));
    leftPct -= maxWidthPct / 2;
    const totalHpct = heightsPct.reduce((a, b) => a + b, 0) + FAN_GAP_PCT * (items.length - 1);
    let topPct = anchorTopPct;
    topPct = Math.max(0, Math.min(topPct, Math.max(0, 100 - totalHpct)));
    let runY = topPct;
    items.forEach((b, i) => {
        const boxLeft = leftPct + (maxWidthPct - widthsPct[i]) / 2;
        layout.set(b.id, clampFanPosition(boxLeft, runY, widthsPct[i], heightsPct[i]));
        runY += heightsPct[i] + FAN_GAP_PCT;
    });
    return layout;
}
