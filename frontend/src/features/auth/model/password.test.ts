import { describe, it, expect } from "vitest";
import { validatePassword, passwordsMatch } from "./password";

describe("validatePassword", () => {
  it("marks a short password as invalid", () => {
    const result = validatePassword("Ab1!");
    const minLength = result.checks.find((c) => c.key === "minLength");

    expect(result.isValid).toBe(false);
    expect(minLength?.passed).toBe(false);
  });

  it("marks a password without uppercase as invalid", () => {
    const result = validatePassword("password1!");
    const upper = result.checks.find((c) => c.key === "hasUppercase");

    expect(result.isValid).toBe(false);
    expect(upper?.passed).toBe(false);
  });

  it("marks a password without digit as invalid", () => {
    const result = validatePassword("Password!");
    const digit = result.checks.find((c) => c.key === "hasDigit");

    expect(result.isValid).toBe(false);
    expect(digit?.passed).toBe(false);
  });

  it("marks a password without special char as invalid", () => {
    const result = validatePassword("Password1");
    const special = result.checks.find((c) => c.key === "hasSpecial");

    expect(result.isValid).toBe(false);
    expect(special?.passed).toBe(false);
  });

  it("marks a strong password as valid", () => {
    const result = validatePassword("StrongPass1!");

    expect(result.isValid).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });
});

describe("passwordsMatch", () => {
  it("returns true when passwords are identical and non-empty", () => {
    expect(passwordsMatch("Secret1!", "Secret1!")).toBe(true);
  });

  it("returns false when passwords differ", () => {
    expect(passwordsMatch("Secret1!", "Secret2!")).toBe(false);
  });

  it("returns false when both passwords are empty", () => {
    expect(passwordsMatch("", "")).toBe(false);
  });
});
