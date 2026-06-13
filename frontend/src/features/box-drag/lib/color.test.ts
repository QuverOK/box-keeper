import { describe, it, expect } from "vitest";
import { darkenColor } from "./color";

describe("darkenColor", () => {
  it("darkens a 6-digit hex by 20% by default", () => {
    // #ffffff → r=204, g=204, b=204 → #cccccc
    expect(darkenColor("#ffffff")).toBe("#cccccc");
  });

  it("darkens a 3-digit hex shorthand", () => {
    // #fff → expanded #ffffff → same result
    expect(darkenColor("#fff")).toBe("#cccccc");
  });

  it("darkens by a custom amount", () => {
    // #ffffff darkened 50% → #808080
    expect(darkenColor("#ffffff", 0.5)).toBe("#808080");
  });

  it("clamps to 0 when darkening exceeds channel max", () => {
    // #000000 darkened any amount stays #000000
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
