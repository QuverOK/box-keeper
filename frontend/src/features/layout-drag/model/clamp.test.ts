import { describe, it, expect } from "vitest";
import { clampPartitionXY, clampLabelXY } from "./clamp";
describe("clampPartitionXY", () => {
    const room = { widthCm: 500, depthCm: 300 };
    it("clamps partition inside room bounds", () => {
        expect(clampPartitionXY(450, 280, 100, 40, room)).toEqual({
            xCm: 400,
            yCm: 260,
        });
    });
    it("clamps negative coordinates to zero", () => {
        expect(clampPartitionXY(-10, -5, 100, 40, room)).toEqual({
            xCm: 0,
            yCm: 0,
        });
    });
});
describe("clampLabelXY", () => {
    const room = { widthCm: 500, depthCm: 300 };
    it("clamps label point inside room", () => {
        expect(clampLabelXY(600, 400, room)).toEqual({ xCm: 500, yCm: 300 });
    });
});
