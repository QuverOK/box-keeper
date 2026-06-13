import { describe, it, expect } from "vitest";
import { computeFanLayout } from "./computeFanLayout";
import type { BoxStack } from "@/features/box-drag";
const roomWcm = 600;
const roomHcm = 500;
function makeStack(boxes: Array<{
    id: string;
    x: number;
    y: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
    z: number;
}>): BoxStack {
    return {
        boxes: boxes.map((b) => ({
            id: b.id,
            x: b.x,
            y: b.y,
            z: b.z,
            sizeW: b.sizeW,
            sizeD: b.sizeD,
            sizeH: b.sizeH,
        })),
        topBoxId: boxes[boxes.length - 1].id,
    };
}
describe("computeFanLayout", () => {
    it("lays boxes horizontally on wide viewport", () => {
        const stack = makeStack([
            { id: "a", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 0 },
            { id: "b", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 30 },
        ]);
        const layout = computeFanLayout({
            stack,
            roomWcm,
            roomHcm,
            viewportW: 800,
        });
        const a = layout.get("a")!;
        const b = layout.get("b")!;
        expect(a.topPct).toBe(b.topPct);
        expect(b.leftPct).toBeGreaterThan(a.leftPct);
    });
    it("uses vertical cascade on narrow viewport (300px)", () => {
        const stack = makeStack([
            { id: "a", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 0 },
            { id: "b", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 30 },
        ]);
        const layout = computeFanLayout({
            stack,
            roomWcm,
            roomHcm,
            viewportW: 300,
        });
        const a = layout.get("a")!;
        const b = layout.get("b")!;
        expect(b.topPct).toBeGreaterThan(a.topPct);
        expect(a.leftPct).toBeCloseTo(b.leftPct, 1);
    });
    it("switches to vertical when total horizontal width exceeds canvas", () => {
        const stack = makeStack([
            { id: "a", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 0 },
            { id: "b", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 40 },
            { id: "c", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 80 },
        ]);
        const layout = computeFanLayout({
            stack,
            roomWcm,
            roomHcm,
            viewportW: 800,
        });
        const positions = stack.boxes.map((b) => layout.get(b.id)!);
        const tops = new Set(positions.map((p) => p.topPct));
        expect(tops.size).toBeGreaterThan(1);
    });
    it("keeps all positions within canvas bounds", () => {
        const stack = makeStack([
            { id: "a", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 0 },
            { id: "b", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 30 },
            { id: "c", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 60 },
        ]);
        const layout = computeFanLayout({
            stack,
            roomWcm,
            roomHcm,
            viewportW: 300,
        });
        for (const box of stack.boxes) {
            const pos = layout.get(box.id)!;
            const wPct = (box.sizeW / roomWcm) * 100;
            const hPct = (box.sizeD / roomHcm) * 100;
            expect(pos.leftPct).toBeGreaterThanOrEqual(0);
            expect(pos.topPct).toBeGreaterThanOrEqual(0);
            expect(pos.leftPct + wPct).toBeLessThanOrEqual(100);
            expect(pos.topPct + hPct).toBeLessThanOrEqual(100);
        }
    });
});
