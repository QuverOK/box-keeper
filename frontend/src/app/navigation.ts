export function stripGuestFromPath(path: string): string {
  try {
    const url = new URL(path, window.location.origin);
    url.searchParams.delete("guest");
    const search = url.searchParams.toString();
    return url.pathname + (search ? `?${search}` : "");
  } catch {
    return path.split("?")[0];
  }
}
