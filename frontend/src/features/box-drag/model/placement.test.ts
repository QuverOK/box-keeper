import { describe, it, expect } from "vitest";
import { computeRestingZ, has3DConflict, findNearestValidXY, computeStacks, overlapsPartitionFootprint, } from "./placement";
import type { PlacedBoxDims, BoxDims, PartitionDims } from "./placement";
const box = (overrides?: Partial<BoxDims>): BoxDims => ({
    id: "b1",
    sizeW: 60,
    sizeD: 60,
    sizeH: 40,
    ...overrides,
});
const placed = (overrides?: Partial<PlacedBoxDims>): PlacedBoxDims => ({
    id: "p1",
    sizeW: 60,
    sizeD: 60,
    sizeH: 40,
    x: 0,
    y: 0,
    z: 0,
    ...overrides,
});
const room = { widthCm: 500, depthCm: 500, heightCm: 300 };
describe("computeRestingZ", () => {
    it("returns 0 when no boxes are present", () => {
        expect(computeRestingZ(0, 0, box(), [])).toBe(0);
    });
    it("returns 0 when there is no footprint overlap", () => {
        const existing = placed({ x: 200, y: 200 });
        expect(computeRestingZ(0, 0, box(), [existing])).toBe(0);
    });
    it("stacks on top of a fully-overlapping box", () => {
        const existing = placed({ sizeH: 40 });
        expect(computeRestingZ(0, 0, box(), [existing])).toBe(40);
    });
    it("ignores the box itself when computing resting Z", () => {
        const self = placed({ id: "b1", sizeH: 40 });
        expect(computeRestingZ(0, 0, box({ id: "b1" }), [self])).toBe(0);
    });
    it("requires ≥60% footprint support to stack", () => {
        const newBox = box({ sizeW: 100, sizeD: 100, sizeH: 30 });
        const existing = placed({
            id: "p1",
            sizeW: 55,
            sizeD: 100,
            sizeH: 50,
            x: 0,
            y: 0,
        });
        expect(computeRestingZ(0, 0, newBox, [existing])).toBe(0);
    });
    it("stacks when footprint support is exactly 60%", () => {
        const newBox = box({ sizeW: 100, sizeD: 100, sizeH: 30 });
        const existing = placed({
            id: "p1",
            sizeW: 60,
            sizeD: 100,
            sizeH: 50,
            x: 0,
            y: 0,
        });
        expect(computeRestingZ(0, 0, newBox, [existing])).toBe(50);
    });
    it("stacks on the tallest sufficiently-supported surface", () => {
        const newBox = box({ sizeW: 100, sizeD: 100 });
        const short = placed({
            id: "p1",
            sizeW: 100,
            sizeD: 100,
            sizeH: 20,
            x: 0,
            y: 0,
        });
        const tall = placed({
            id: "p2",
            sizeW: 100,
            sizeD: 100,
            sizeH: 60,
            x: 0,
            y: 0,
        });
        expect(computeRestingZ(0, 0, newBox, [short, tall])).toBe(60);
    });
});
describe("has3DConflict", () => {
    it("returns false when no other boxes exist", () => {
        expect(has3DConflict(0, 0, 0, box(), [])).toBe(false);
    });
    it("returns false when boxes only touch edges (not overlap)", () => {
        const existing = placed({ x: 60, y: 0, z: 0 });
        expect(has3DConflict(0, 0, 0, box(), [existing])).toBe(false);
    });
    it("detects overlap when boxes share volume", () => {
        const existing = placed({ x: 30, y: 0, z: 0 });
        expect(has3DConflict(0, 0, 0, box(), [existing])).toBe(true);
    });
    it("ignores self (same id)", () => {
        const self = placed({ id: "b1", x: 0, y: 0, z: 0 });
        expect(has3DConflict(0, 0, 0, box({ id: "b1" }), [self])).toBe(false);
    });
});
describe("findNearestValidXY", () => {
    it("returns the desired position when it is free", () => {
        const result = findNearestValidXY(0, 0, box(), [], room);
        expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });
    it("clamps to room bounds", () => {
        const result = findNearestValidXY(600, 0, box({ sizeW: 60 }), [], room);
        expect(result?.x).toBe(440);
    });
    it("finds a nearby free spot via spiral when desired position is blocked", () => {
        const blocker = placed({
            id: "p1",
            x: 0,
            y: 0,
            z: 0,
            sizeW: 60,
            sizeD: 60,
            sizeH: 40,
        });
        const result = findNearestValidXY(0, 0, box({ id: "b2" }), [blocker], room);
        expect(result).not.toBeNull();
        if (result) {
            expect(has3DConflict(result.x, result.y, result.z, box({ id: "b2" }), [
                blocker,
            ])).toBe(false);
        }
    });
    it("returns null when the room is completely full", () => {
        const giant = placed({
            id: "p1",
            x: 0,
            y: 0,
            z: 0,
            sizeW: 500,
            sizeD: 500,
            sizeH: 300,
        });
        const result = findNearestValidXY(0, 0, box({ id: "b2" }), [giant], {
            widthCm: 60,
            depthCm: 60,
            heightCm: 40,
        });
        expect(result).toBeNull();
    });
    it("avoids dropping onto a forbidden zone and finds a spot outside it", () => {
        const forbidden = { x: 0, y: 0, w: 100, d: 100 };
        const result = findNearestValidXY(0, 0, box({ id: "b2" }), [], room, forbidden);
        expect(result).not.toBeNull();
        if (result) {
            const overlapsX = result.x < 100 && result.x + 60 > 0;
            const overlapsY = result.y < 100 && result.y + 60 > 0;
            expect(overlapsX && overlapsY).toBe(false);
        }
    });
    it("ignores a null forbidden zone", () => {
        const result = findNearestValidXY(0, 0, box(), [], room, null);
        expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });
    it("rejects placement on a partition footprint", () => {
        const partition: PartitionDims = {
            id: "part1",
            x: 0,
            y: 0,
            z: 0,
            width: 100,
            depth: 40,
            height: 5,
        };
        const dragged = box({ id: "b2", sizeW: 60, sizeD: 60 });
        expect(overlapsPartitionFootprint(0, 0, dragged, [partition])).toBe(true);
        const result = findNearestValidXY(0, 0, dragged, [], room, null, [
            partition,
        ]);
        expect(result).not.toBeNull();
        if (result) {
            expect(overlapsPartitionFootprint(result.x, result.y, dragged, [partition])).toBe(false);
        }
    });
    it("does not stack on top of a partition", () => {
        const partition: PartitionDims = {
            id: "part1",
            x: 0,
            y: 0,
            z: 0,
            width: 100,
            depth: 100,
            height: 5,
        };
        expect(computeRestingZ(0, 0, box(), [], [partition])).toBe(0);
        expect(overlapsPartitionFootprint(0, 0, box(), [partition])).toBe(true);
    });
});
describe("computeStacks", () => {
    it("returns no stacks for an empty list", () => {
        expect(computeStacks([])).toEqual([]);
    });
    it("returns no stacks for a single box", () => {
        expect(computeStacks([placed({ id: "a" })])).toEqual([]);
    });
    it("ignores boxes that do not overlap on XY", () => {
        const a = placed({ id: "a", x: 0, y: 0 });
        const b = placed({ id: "b", x: 200, y: 200 });
        expect(computeStacks([a, b])).toEqual([]);
    });
    it("groups two fully-overlapping stacked boxes", () => {
        const bottom = placed({ id: "bottom", x: 0, y: 0, z: 0, sizeH: 40 });
        const top = placed({ id: "top", x: 0, y: 0, z: 40, sizeH: 40 });
        const stacks = computeStacks([top, bottom]);
        expect(stacks).toHaveLength(1);
        expect(stacks[0].boxes.map((b) => b.id)).toEqual(["bottom", "top"]);
        expect(stacks[0].topBoxId).toBe("top");
    });
    it("sorts stack boxes by z ascending regardless of input order", () => {
        const a = placed({ id: "a", z: 0, sizeH: 30 });
        const b = placed({ id: "b", z: 30, sizeH: 30 });
        const c = placed({ id: "c", z: 60, sizeH: 30 });
        const stacks = computeStacks([c, a, b]);
        expect(stacks).toHaveLength(1);
        expect(stacks[0].boxes.map((box) => box.id)).toEqual(["a", "b", "c"]);
        expect(stacks[0].topBoxId).toBe("c");
    });
    it("does not group boxes overlapping by less than 60% of the smaller footprint", () => {
        const a = placed({
            id: "a",
            x: 0,
            y: 0,
            sizeW: 100,
            sizeD: 100,
            z: 0,
            sizeH: 40,
        });
        const b = placed({
            id: "b",
            x: 50,
            y: 0,
            sizeW: 100,
            sizeD: 100,
            z: 40,
            sizeH: 40,
        });
        expect(computeStacks([a, b])).toEqual([]);
    });
    it("picks topBoxId by max (z + sizeH), not just max z", () => {
        const bottom = placed({ id: "bottom", x: 0, y: 0, z: 0, sizeH: 40 });
        const top = placed({ id: "top", x: 0, y: 0, z: 40, sizeH: 30 });
        const stacks = computeStacks([bottom, top]);
        expect(stacks).toHaveLength(1);
        expect(stacks[0].topBoxId).toBe("top");
    });
    it("separates two stacks at same XY with a vertical gap", () => {
        const s1a = placed({ id: "s1a", x: 0, y: 0, z: 0, sizeH: 40 });
        const s1b = placed({ id: "s1b", x: 0, y: 0, z: 40, sizeH: 40 });
        const s2a = placed({ id: "s2a", x: 0, y: 0, z: 120, sizeH: 40 });
        const s2b = placed({ id: "s2b", x: 0, y: 0, z: 160, sizeH: 40 });
        const stacks = computeStacks([s1a, s1b, s2a, s2b]);
        expect(stacks).toHaveLength(2);
    });
    it("separates independent stacks", () => {
        const a1 = placed({ id: "a1", x: 0, y: 0, z: 0, sizeH: 40 });
        const a2 = placed({ id: "a2", x: 0, y: 0, z: 40, sizeH: 40 });
        const b1 = placed({ id: "b1", x: 300, y: 300, z: 0, sizeH: 40 });
        const b2 = placed({ id: "b2", x: 300, y: 300, z: 40, sizeH: 40 });
        const stacks = computeStacks([a1, a2, b1, b2]);
        expect(stacks).toHaveLength(2);
        const ids = stacks.map((s) => s.boxes
            .map((b) => b.id)
            .sort()
            .join(","));
        expect(ids.sort()).toEqual(["a1,a2", "b1,b2"]);
    });
});
