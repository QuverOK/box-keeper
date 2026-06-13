import { describe, it, expect } from "vitest";
import { computeRestingZ, boxFitsInStorage, isPlaced } from "./placement";
import type { PlacedBox } from "./placement";
import type { Box } from "@/shared/model";
const makePlacedBox = (overrides: Partial<PlacedBox>): PlacedBox => ({
    id: "b1",
    name: "Box",
    color: "#fff",
    qrCode: "QR",
    sizeW: 60,
    sizeD: 60,
    sizeH: 40,
    posX: 0,
    posY: 0,
    posZ: 0,
    storageId: "s1",
    createdAt: new Date().toISOString(),
    ...overrides,
});
describe("computeRestingZ", () => {
    it("returns 0 when no boxes are below", () => {
        const z = computeRestingZ({ posX: 0, posY: 0, sizeW: 60, sizeD: 60, sizeH: 40 }, []);
        expect(z).toBe(0);
    });
    it("returns top of overlapping box", () => {
        const existing = makePlacedBox({ posX: 0, posY: 0, posZ: 0, sizeH: 40 });
        const z = computeRestingZ({ posX: 0, posY: 0, sizeW: 60, sizeD: 60, sizeH: 30 }, [existing]);
        expect(z).toBe(40);
    });
    it("stacks correctly on the tallest overlapping box", () => {
        const box1 = makePlacedBox({ posX: 0, posY: 0, posZ: 0, sizeH: 40 });
        const box2 = makePlacedBox({ posX: 0, posY: 0, posZ: 40, sizeH: 50 });
        const z = computeRestingZ({ posX: 0, posY: 0, sizeW: 30, sizeD: 30, sizeH: 20 }, [box1, box2]);
        expect(z).toBe(90);
    });
    it("ignores boxes that do not overlap horizontally", () => {
        const existing = makePlacedBox({
            posX: 200,
            posY: 200,
            posZ: 0,
            sizeH: 80,
        });
        const z = computeRestingZ({ posX: 0, posY: 0, sizeW: 60, sizeD: 60, sizeH: 40 }, [existing]);
        expect(z).toBe(0);
    });
});
describe("boxFitsInStorage", () => {
    const room = { roomWidth: 6, roomDepth: 5, roomHeight: 2.5 };
    it("returns true when box fits within bounds", () => {
        expect(boxFitsInStorage({ posX: 0, posY: 0, posZ: 0, sizeW: 60, sizeD: 80, sizeH: 40 }, room)).toBe(true);
    });
    it("returns false when box exceeds room width", () => {
        expect(boxFitsInStorage({ posX: 0, posY: 0, posZ: 0, sizeW: 700, sizeD: 80, sizeH: 40 }, room)).toBe(false);
    });
    it("returns false when box position puts it outside bounds", () => {
        expect(boxFitsInStorage({ posX: 550, posY: 0, posZ: 0, sizeW: 60, sizeD: 80, sizeH: 40 }, room)).toBe(false);
    });
});
describe("isPlaced", () => {
    it("returns true when all position coords are set", () => {
        const box: Box = {
            id: "b1",
            name: "X",
            color: "#fff",
            qrCode: "Q",
            sizeW: 60,
            sizeD: 60,
            sizeH: 40,
            posX: 0,
            posY: 0,
            posZ: 0,
            storageId: "s1",
            createdAt: "",
        };
        expect(isPlaced(box)).toBe(true);
    });
    it("returns false when any position coord is null", () => {
        const box: Box = {
            id: "b1",
            name: "X",
            color: "#fff",
            qrCode: "Q",
            sizeW: 60,
            sizeD: 60,
            sizeH: 40,
            posX: null,
            posY: null,
            posZ: null,
            storageId: "s1",
            createdAt: "",
        };
        expect(isPlaced(box)).toBe(false);
    });
});
