import { describe, it, expect, beforeAll } from "vitest";
import { buildApiUrl } from "./client";

beforeAll(() => {
  // jsdom sets window.location.origin to 'http://localhost'
  Object.defineProperty(window, "location", {
    value: { origin: "http://localhost" },
    writable: true,
  });
});

describe("buildApiUrl", () => {
  it("appends query params and ignores empty values", () => {
    const url = buildApiUrl("/storages", {
      page: 2,
      search: "garage",
      skip: undefined,
      empty: "",
    });

    expect(url.pathname.endsWith("/storages")).toBe(true);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("search")).toBe("garage");
    expect(url.searchParams.has("skip")).toBe(false);
    expect(url.searchParams.has("empty")).toBe(false);
  });

  it("returns URL without query string when no params provided", () => {
    const url = buildApiUrl("/storages");

    expect(url.searchParams.toString()).toBe("");
    expect(url.pathname).toContain("/storages");
  });

  it("handles null param values by skipping them", () => {
    const url = buildApiUrl("/boxes", { boxId: null });

    expect(url.searchParams.has("boxId")).toBe(false);
  });

  it("converts boolean params to string", () => {
    const url = buildApiUrl("/items", { published: true });

    expect(url.searchParams.get("published")).toBe("true");
  });
});
