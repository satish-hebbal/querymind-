/**
 * Visualization color system.
 *
 * Design principle (learned from professional dashboards): use color sparingly.
 * - Single-series views (rankings, one metric) use ONE primary color over a
 *   faint "track" — not a rainbow. That restraint is what reads as professional.
 * - Multi-category / part-of-whole views (pie, breakdown, distinct KPIs) use the
 *   categorical palette so each category is its own hue.
 */

/** Primary accent — a modern violet that sits well on the dark theme. */
export const VIZ_PRIMARY = "#7c6cf5";

/** Distinct, harmonious categorical hues for multi-series / part-of-whole data. */
export const VIZ_PALETTE = [
  "#7c6cf5", // violet
  "#2dd4bf", // teal
  "#fb7185", // coral
  "#38bdf8", // sky
  "#fbbf24", // amber
  "#f472b6", // pink
  "#4ade80", // green
  "#c084fc", // purple
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Translucent version of a color — used for bar tracks, fills and hover states. */
export function tint(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Color at position t (0..1) interpolated across the categorical palette. */
export function colorAt(t: number): string {
  const stops = VIZ_PALETTE;
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(pos));
  const local = pos - idx;
  const [r1, g1, b1] = hexToRgb(stops[idx]);
  const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
  return rgbToHex(r1 + (r2 - r1) * local, g1 + (g2 - g1) * local, b1 + (b2 - b1) * local);
}

/**
 * `n` distinct categorical colors. Up to the palette length they're the exact
 * hand-picked hues; beyond that they're interpolated so large category sets
 * still differentiate.
 */
export function seriesColors(n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [VIZ_PRIMARY];
  if (n <= VIZ_PALETTE.length) return VIZ_PALETTE.slice(0, n);
  return Array.from({ length: n }, (_, i) => colorAt(i / (n - 1)));
}
