import { describe, it, expect } from "vitest";
import { searchStorageBoxes, isDuplicateBoxName } from "./search";
describe("searchStorageBoxes", () => {
    const boxes = [
        {
            id: "b1",
            name: "Инструменты v1.0",
            items: [
                {
                    id: "i1",
                    name: "Драйвер v1.0",
                    category: "Tools",
                    description: "",
                },
            ],
        },
        {
            id: "b2",
            name: "Книги",
            items: [{ id: "i2", name: "Роман", category: "Lit", description: "" }],
        },
    ];
    it("finds items with dot in name", () => {
        const results = searchStorageBoxes(boxes, "v1.0");
        expect(results.some((r) => r.item?.name === "Драйвер v1.0")).toBe(true);
    });
    it("finds box by name with dot", () => {
        const results = searchStorageBoxes(boxes, "v1.0");
        expect(results.some((r) => r.box.name.includes("v1.0"))).toBe(true);
    });
    it("returns empty for blank query", () => {
        expect(searchStorageBoxes(boxes, "   ")).toEqual([]);
    });
});
describe("isDuplicateBoxName", () => {
    const boxes = [
        { id: "a", name: "Коробка" },
        { id: "b", name: "Other" },
    ];
    it("detects duplicate case-insensitive", () => {
        expect(isDuplicateBoxName("коробка", boxes)).toBe(true);
    });
    it("ignores excluded box id", () => {
        expect(isDuplicateBoxName("Коробка", boxes, "a")).toBe(false);
    });
});
