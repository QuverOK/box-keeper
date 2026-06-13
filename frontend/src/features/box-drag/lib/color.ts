export function darkenColor(hex: string, amount = 0.2): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(clean)) return hex;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = Math.round(parseInt(full.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(full.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(full.slice(4, 6), 16) * (1 - amount));
  return `#${[r, g, b].map((v) => Math.max(0, v).toString(16).padStart(2, "0")).join("")}`;
}
function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(clean)) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const [rs, gs, bs] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
export function isColorTooDark(hex: string, threshold = 0.35): boolean {
  const lum = getRelativeLuminance(hex);
  return lum !== null && lum < threshold;
}
export function getContrastColor(hex: string): string {
  const lum = getRelativeLuminance(hex);
  if (lum === null) return "#000000";
  return lum > 0.179 ? "#000000" : "#ffffff";
}
export function getBorderColor(hex: string): string {
  const lum = getRelativeLuminance(hex);
  if (lum === null) return "rgba(0,0,0,0.2)";
  return lum > 0.179 ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)";
}
