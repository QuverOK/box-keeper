import { describe, it, expect } from "vitest";
import { createApiError, normalizeApiError } from "./errors";

describe("createApiError", () => {
  it("extracts message from plain string payload", () => {
    const error = createApiError("Unauthorized", 401);

    expect(error.message).toBe("Unauthorized");
    expect(error.status).toBe(401);
  });

  it("extracts message from backend array message", () => {
    const error = createApiError(
      { message: ["email invalid", "password short"] },
      400,
    );

    expect(error.message).toBe("email invalid, password short");
    expect(error.status).toBe(400);
  });

  it("extracts message from single string in message field", () => {
    const error = createApiError({ message: "Конфликт" }, 409);

    expect(error.message).toBe("Конфликт");
    expect(error.status).toBe(409);
  });

  it("returns fallback for unrecognised object payload", () => {
    const error = createApiError({ unexpected: true }, 500);

    expect(error.message).toBe("Произошла ошибка сервера");
    expect(error.status).toBe(500);
  });
});

describe("normalizeApiError", () => {
  it("normalizes unknown values to fallback error", () => {
    const error = normalizeApiError(12345);

    expect(error.message).toBe("Произошла неизвестная ошибка");
    expect(error.status).toBe(0);
  });

  it("normalizes an Error instance", () => {
    const error = normalizeApiError(new Error("Network failure"));

    expect(error.message).toBe("Network failure");
    expect(error.status).toBe(0);
  });

  it("normalizes a structured API rejection {status, data}", () => {
    const error = normalizeApiError({ status: 401, data: "Unauthorized" });

    expect(error.message).toBe("Unauthorized");
    expect(error.status).toBe(401);
  });
});
