import { describe, it, expect } from "vitest";
import {
  validateBoxFitsInRoom,
  findBoxesExceedingRoom,
  validateStorageRoomFitsAllBoxes,
} from "./validation";
const ROOM = { roomWidth: 6, roomDepth: 5, roomHeight: 2.5 };
describe("validateBoxFitsInRoom", () => {
  it("returns valid for a box that fits within room bounds", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 60, sizeD: 80, sizeH: 40 },
      ROOM,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  it("returns error when width exceeds room width", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 700, sizeD: 80, sizeH: 40 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Длина"))).toBe(true);
  });
  it("returns error when depth exceeds room depth", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 60, sizeD: 600, sizeH: 40 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Ширина"))).toBe(true);
  });
  it("returns error when height exceeds room height", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 60, sizeD: 80, sizeH: 300 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Высота"))).toBe(true);
  });
  it("returns error for zero-width box", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 0, sizeD: 80, sizeH: 40 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("Длина коробки не может быть меньше 1 см"),
      ),
    ).toBe(true);
  });
  it("returns error for sub-minimum dimension", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 0.5, sizeD: 80, sizeH: 40 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("Длина коробки не может быть меньше 1 см"),
      ),
    ).toBe(true);
  });
  it("can report multiple errors at once", () => {
    const result = validateBoxFitsInRoom(
      { sizeW: 700, sizeD: 600, sizeH: 300 },
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
describe("findBoxesExceedingRoom", () => {
  it("returns empty array when all boxes fit", () => {
    const boxes = [
      { name: "A", sizeW: 60, sizeD: 80, sizeH: 40 },
      { name: "B", sizeW: 100, sizeD: 50, sizeH: 30 },
    ];
    expect(findBoxesExceedingRoom(boxes, ROOM)).toHaveLength(0);
  });
  it("returns boxes that exceed any room dimension", () => {
    const boxes = [
      { name: "Fits", sizeW: 60, sizeD: 80, sizeH: 40 },
      { name: "Too wide", sizeW: 700, sizeD: 80, sizeH: 40 },
      { name: "Too tall", sizeW: 60, sizeD: 80, sizeH: 300 },
    ];
    const result = findBoxesExceedingRoom(boxes, ROOM);
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.name)).toEqual(["Too wide", "Too tall"]);
  });
});
describe("validateStorageRoomFitsAllBoxes", () => {
  it("returns valid when all boxes fit", () => {
    const result = validateStorageRoomFitsAllBoxes(
      [{ name: "A", sizeW: 60, sizeD: 80, sizeH: 40 }],
      ROOM,
    );
    expect(result.valid).toBe(true);
  });
  it("returns error with box names when some boxes exceed room", () => {
    const result = validateStorageRoomFitsAllBoxes(
      [
        { name: "Книги", sizeW: 700, sizeD: 80, sizeH: 40 },
        { name: "Одежда", sizeW: 60, sizeD: 80, sizeH: 40 },
      ],
      ROOM,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("некоторые коробки превышают");
    expect(result.errors[0]).toContain("Книги");
  });
});
