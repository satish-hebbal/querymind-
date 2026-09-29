"use client";

import { useEffect, useRef } from "react";

/*
 * Dithered and ANSI-art decoration, in the same spirit as Ribbit's Signal and
 * ASCII tools: draw a soft luminance field at low resolution, then quantise it.
 *
 *   "dither" runs an ordered Bayer 8x8 mask over a three-level palette
 *   (transparent, dim accent, accent). Ordered dithering never looks at its
 *   neighbours, so the pattern stays stable frame to frame while the field moves.
 *
 *   "ascii" samples the field once per character cell and picks a glyph from a
 *   ramp written lightest first, nudged by the same Bayer mask so gradients
 *   break up into texture instead of banding.
 */

const BAYER8 = (() => {
  let m = [
    [0, 2],
    [3, 1],
  ];
  while (m.length < 8) {
    const n = m.length;
    const next = Array.from({ length: n * 2 }, () => new Array<number>(n * 2).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v;
        next[y][x + n] = v + 2;
        next[y + n][x] = v + 3;
        next[y + n][x + n] = v + 1;
      }
    }
    m = next;
  }
  return m.flat().map((v) => (v + 0.5) / 64);
})();

const threshold = (x: number, y: number) => BAYER8[(y & 7) * 8 + (x & 7)];

export const RAMP_STANDARD = " .:-=+*#%@";
export const RAMP_BLOCKS = " ░▒▓█";

/** Draws a white-on-transparent luminance field in CSS pixel space. */
export type FieldPainter = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, growth: number) => void;

function readAccent(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-green").trim();
  const parts = raw.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => !Number.isNaN(n)) ? (parts as [number, number, number]) : [34, 197, 94];
}

interface DitherCanvasProps {
  paint: FieldPainter;
  mode?: "dither" | "ascii";
  /** CSS pixels per dither dot. */
  pixel?: number;
  /** Character cell size for ascii mode, in CSS pixels. */
  cell?: [number, number];
  ramp?: string;
  fps?: number;
  /** How long the grow-in takes once the canvas is on screen. */
  growMs?: number;
  className?: string;
}

export function DitherCanvas({
  paint,
  mode = "dither",
  pixel = 3,
  cell = [8, 13],
  ramp = RAMP_STANDARD,
  fps = 20,
  growMs = 2600,
  className = "",
}: DitherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const field = document.createElement("canvas");
    const fctx = field.getContext("2d", { willReadFrequently: true });
    const out = document.createElement("canvas");
    const octx = out.getContext("2d");
    if (!fctx || !octx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let accent = readAccent();
    let cssW = 0;
    let cssH = 0;
    let gw = 0;
    let gh = 0;
    let dpr = 1;
    let monoFamily = "monospace";
    let visible = false;
    let growStart: number | null = null;
    let last = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      if (mode === "dither") {
        gw = Math.ceil(cssW / pixel);
        gh = Math.ceil(cssH / pixel);
      } else {
        gw = Math.ceil(cssW / cell[0]);
        gh = Math.ceil(cssH / cell[1]);
      }
      field.width = gw;
      field.height = gh;
      out.width = gw;
      out.height = gh;
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
      if (family) monoFamily = `${family}, monospace`;
    };

    const frame = (now: number) => {
      if (growStart === null) growStart = now;
      const raw = reduced ? 1 : Math.min(1, (now - growStart) / growMs);
      const growth = 1 - Math.pow(1 - raw, 3);
      const t = reduced ? 0 : now;

      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, gw, gh);
      fctx.setTransform(gw / cssW, 0, 0, gh / cssH, 0, 0);
      paintRef.current(fctx, cssW, cssH, t, growth);

      const src = fctx.getImageData(0, 0, gw, gh).data;
      const [r, g, b] = accent;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === "dither") {
        const img = octx.createImageData(gw, gh);
        const px = img.data;
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            const i = (y * gw + x) * 4;
            const lum = (src[i + 3] / 255) * (src[i] / 255);
            if (lum < 0.01) continue;
            const level = Math.max(0, Math.min(2, Math.floor(lum * 2 + threshold(x, y))));
            if (level === 0) continue;
            px[i] = r;
            px[i + 1] = g;
            px[i + 2] = b;
            px[i + 3] = level === 2 ? 235 : 105;
          }
        }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(out, 0, 0, canvas.width, canvas.height);
      } else {
        const n = ramp.length;
        const chars = Array.from(ramp);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${cell[1] - 2}px ${monoFamily}`;
        ctx.textBaseline = "top";
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            const i = (y * gw + x) * 4;
            const lum = (src[i + 3] / 255) * (src[i] / 255);
            if (lum < 0.03) continue;
            const idx = Math.max(0, Math.min(n - 1, Math.floor(lum * (n - 1) + (threshold(x, y) - 0.5) * 1.2 + 0.5)));
            if (idx === 0) continue;
            const strong = idx / (n - 1);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + strong * 0.7})`;
            ctx.fillText(chars[idx], x * cell[0], y * cell[1]);
          }
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (now - last < 1000 / fps) return;
      last = now;
      frame(now);
      if (reduced) cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) frame(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && reduced) frame(performance.now());
    });
    io.observe(canvas);

    // Re-read the accent when the theme toggles.
    const mo = new MutationObserver(() => {
      accent = readAccent();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pixel, cell[0], cell[1], ramp, fps, growMs]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none block h-full w-full ${className}`} />;
}

/* ── Procedural branch ───────────────────────────────────────────────────── */

interface Seg {
  depth: number;
  len: number;
  rel: number;
  width: number;
  phase: number;
  leaf: boolean;
  children: Seg[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A branch as a tree of segments: each node carries on roughly straight and
 * throws off one side twig, alternating sides, the way a real branch grows.
 */
function buildBranch(seed: number, maxDepth: number): Seg {
  const rand = mulberry32(seed);
  let side = 1;
  const grow = (depth: number, len: number, width: number, rel: number): Seg => {
    const seg: Seg = { depth, len, rel, width, phase: rand() * Math.PI * 2, leaf: false, children: [] };
    if (depth >= maxDepth) {
      seg.leaf = true;
      return seg;
    }
    seg.children.push(grow(depth + 1, len * (0.78 + rand() * 0.1), width * 0.72, (rand() - 0.5) * 0.35));
    if (depth > 0 || rand() > 0.3) {
      side = -side;
      seg.children.push(grow(depth + 1, len * (0.5 + rand() * 0.18), width * 0.6, side * (0.55 + rand() * 0.4)));
    }
    if (depth >= maxDepth - 2) seg.leaf = true;
    return seg;
  };
  return grow(0, 1, 1, 0);
}

interface BranchOptions {
  seed?: number;
  depth?: number;
  /** Where the branch enters, as fractions of the canvas. */
  origin: [number, number];
  /** Heading in radians (0 points right, PI/2 points down). */
  angle: number;
  /** Trunk segment length as a fraction of the canvas' smaller side. */
  size?: number;
  leaves?: boolean;
  /** Adds a soft dithered halo around the origin. */
  halo?: boolean;
}

export function makeBranchPainter({
  seed = 7,
  depth = 7,
  origin,
  angle,
  size = 0.3,
  leaves = true,
  halo = true,
}: BranchOptions): FieldPainter {
  const root = buildBranch(seed, depth);

  return (ctx, w, h, t, growth) => {
    const scale = Math.min(w, h) * size;
    const ox = origin[0] * w;
    const oy = origin[1] * h;

    if (halo) {
      const r = Math.max(w, h) * 0.75;
      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      grad.addColorStop(0, `rgba(255,255,255,${0.26 * growth})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.lineCap = "round";
    const stages = depth + 1.5;

    const draw = (seg: Seg, x: number, y: number, heading: number) => {
      const local = Math.max(0, Math.min(1, growth * stages - seg.depth));
      if (local <= 0) return;
      const sway = Math.sin(t * 0.0007 + seg.phase + seg.depth * 0.5) * 0.028 * seg.depth;
      const a = heading + seg.rel + sway;
      const len = seg.len * scale * local;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;

      ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * (1 - seg.depth / depth)})`;
      ctx.lineWidth = Math.max(0.6, seg.width * scale * 0.09);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (local < 1) return;

      if (leaves && seg.leaf) {
        const leafSize = scale * 0.11 * (0.7 + (seg.phase / (Math.PI * 2)) * 0.6);
        for (const offset of [-0.9, 0.9]) {
          const la = a + offset + Math.sin(t * 0.0011 + seg.phase) * 0.15;
          const lx = x2 + Math.cos(la) * leafSize * 0.55;
          const ly = y2 + Math.sin(la) * leafSize * 0.55;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(la);
          const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, leafSize * 0.6);
          lg.addColorStop(0, "rgba(255,255,255,0.95)");
          lg.addColorStop(0.7, "rgba(255,255,255,0.45)");
          lg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.ellipse(0, 0, leafSize * 0.6, leafSize * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      for (const child of seg.children) draw(child, x2, y2, a);
    };

    draw(root, ox, oy, angle);
  };
}

/** A decorative branch, dithered or as ANSI text. */
export function DitherBranch({
  mode = "dither",
  className = "",
  pixel,
  ramp,
  ...branch
}: BranchOptions & { mode?: "dither" | "ascii"; className?: string; pixel?: number; ramp?: string }) {
  const painterRef = useRef<FieldPainter | null>(null);
  if (!painterRef.current) painterRef.current = makeBranchPainter(branch);
  return <DitherCanvas paint={painterRef.current} mode={mode} pixel={pixel} ramp={ramp} className={className} />;
}

/** A slowly breathing dithered glow, used behind hero product shots. */
export function DitherGlow({ className = "", pixel = 3 }: { className?: string; pixel?: number }) {
  const painterRef = useRef<FieldPainter>((ctx, w, h, t, growth) => {
    const breathe = 0.85 + Math.sin(t * 0.0008) * 0.15;
    const cx = w / 2 + Math.sin(t * 0.0003) * w * 0.04;
    const grad = ctx.createRadialGradient(cx, h * 0.55, 0, cx, h * 0.55, Math.max(w, h) * 0.55 * breathe);
    grad.addColorStop(0, `rgba(255,255,255,${0.55 * growth})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${0.18 * growth})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  return <DitherCanvas paint={painterRef.current} pixel={pixel} growMs={1800} className={className} />;
}
