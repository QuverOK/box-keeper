const BASE_URL = "/api";
export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;
export function buildApiUrl(path: string, params?: QueryParams): URL {
  const url = new URL(path, window.location.origin);
  url.pathname = BASE_URL + path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
}
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: QueryParams,
): Promise<T> {
  const url = buildApiUrl(path, params);
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw { status: res.status, data };
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    request<T>("GET", path, undefined, params),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
