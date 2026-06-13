export interface ApiError {
  message: string;
  status: number;
}
export function createApiError(payload: unknown, status: number): ApiError {
  if (typeof payload === "string") {
    return { message: payload, status };
  }
  if (payload !== null && typeof payload === "object" && "message" in payload) {
    const raw = (
      payload as {
        message: unknown;
      }
    ).message;
    if (Array.isArray(raw)) {
      return { message: raw.join(", "), status };
    }
    if (typeof raw === "string") {
      return { message: raw, status };
    }
  }
  return { message: "Произошла ошибка сервера", status };
}
export function normalizeApiError(error: unknown): ApiError {
  if (
    error !== null &&
    typeof error === "object" &&
    "status" in error &&
    "data" in error
  ) {
    const e = error as {
      status: number;
      data: unknown;
    };
    return createApiError(e.data, e.status);
  }
  if (error instanceof Error) {
    return { message: error.message, status: 0 };
  }
  return { message: "Произошла неизвестная ошибка", status: 0 };
}
