import { describe, it, expect } from "vitest";
import { darkenColor } from "../lib/boxColor";
describe("darkenColor", () => {
  it("darkens a 6-digit hex by 20% by default", () => {
    expect(darkenColor("#ffffff")).toBe("#cccccc");
  });
  it("darkens a 3-digit hex shorthand", () => {
    expect(darkenColor("#fff")).toBe("#cccccc");
  });
  it("darkens by a custom amount", () => {
    expect(darkenColor("#ffffff", 0.5)).toBe("#808080");
  });
  it("clamps to 0 when darkening exceeds channel max", () => {
    expect(darkenColor("#000000", 0.5)).toBe("#000000");
  });
  it("returns the original value for non-hex inputs", () => {
    expect(darkenColor("rgb(255,0,0)")).toBe("rgb(255,0,0)");
    expect(darkenColor("red")).toBe("red");
    expect(darkenColor("")).toBe("");
  });
  it("handles lowercase and uppercase hex", () => {
    expect(darkenColor("#FFFFFF")).toBe("#cccccc");
    expect(darkenColor("#aabbcc", 0)).toBe("#aabbcc");
  });
});
