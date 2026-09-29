/*
 * Text set in the "ANSI Shadow" figlet style: solid █ blocks with a double-line
 * box-drawing shadow. Drawn as SVG instead of typed with a font, because the
 * web font subsets don't carry the box-drawing range and a fallback font's
 * glyphs would never line up cell for cell.
 */

const GLYPHS: Record<string, string[]> = {
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  B: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ "],
  D: ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  G: [" ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  K: ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
  N: ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"],
  O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  T: ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
  U: ["██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  Y: ["██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   "],
  ".": ["   ", "   ", "   ", "   ", "██╗", "╚═╝"],
  " ": ["   ", "   ", "   ", "   ", "   ", "   "],
};

const ROWS = 6;
const CW = 10; // cell width
const CH = 20; // cell height, the 1:2 aspect of a terminal cell
const LINE_GAP = 14;

// Double-line strokes sit at these offsets inside a cell.
const X1 = 3.5;
const X2 = 6.5;
const Y1 = 7;
const Y2 = 13;

/** Path segments for one box-drawing character, in cell-local units. */
function boxPath(ch: string, x: number, y: number): string {
  const h = (yy: number, a: number, b: number) => `M${x + a} ${y + yy}H${x + b}`;
  const v = (xx: number, a: number, b: number) => `M${x + xx} ${y + a}V${y + b}`;
  switch (ch) {
    case "═":
      return h(Y1, 0, CW) + h(Y2, 0, CW);
    case "║":
      return v(X1, 0, CH) + v(X2, 0, CH);
    case "╗":
      return h(Y1, 0, X2) + v(X2, Y1, CH) + h(Y2, 0, X1) + v(X1, Y2, CH);
    case "╔":
      return h(Y1, X1, CW) + v(X1, Y1, CH) + h(Y2, X2, CW) + v(X2, Y2, CH);
    case "╝":
      return h(Y2, 0, X2) + v(X2, 0, Y2) + h(Y1, 0, X1) + v(X1, 0, Y1);
    case "╚":
      return h(Y2, X1, CW) + v(X1, 0, Y2) + h(Y1, X2, CW) + v(X2, 0, Y1);
    default:
      return "";
  }
}

function layoutLine(text: string): string[] {
  const rows = Array.from({ length: ROWS }, () => "");
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < ROWS; r++) rows[r] += glyph[r];
  }
  return rows;
}

export default function AnsiText({ lines, className = "" }: { lines: string[]; className?: string }) {
  const laid = lines.map(layoutLine);
  const cols = Math.max(...laid.map((rows) => Array.from(rows[0]).length));
  const width = cols * CW;
  const height = lines.length * ROWS * CH + (lines.length - 1) * LINE_GAP;

  const blocks: { x: number; y: number; w: number; col: number }[] = [];
  let shadow = "";

  laid.forEach((rows, li) => {
    const lineCols = Array.from(rows[0]).length;
    const offsetX = ((cols - lineCols) / 2) * CW;
    const offsetY = li * (ROWS * CH + LINE_GAP);
    rows.forEach((row, r) => {
      const chars = Array.from(row);
      let run = -1;
      chars.forEach((ch, c) => {
        const x = offsetX + c * CW;
        const y = offsetY + r * CH;
        if (ch === "█") {
          if (run < 0) run = c;
        } else {
          if (run >= 0) {
            blocks.push({ x: offsetX + run * CW, y, w: (c - run) * CW, col: run + (offsetX / CW) });
            run = -1;
          }
          shadow += boxPath(ch, x, y);
        }
      });
      if (run >= 0) {
        blocks.push({ x: offsetX + run * CW, y: offsetY + r * CH, w: (chars.length - run) * CW, col: run + offsetX / CW });
      }
    });
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={shadow} fill="none" strokeWidth="1.3" className="ansi-shadow stroke-ink-tertiary" />
      <g className="fill-ink">
        {blocks.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            // A hair of overlap so neighbouring blocks never show a seam.
            width={b.w + 0.4}
            height={CH + 0.4}
            className="ansi-block"
            style={{ animationDelay: `${b.col * 14 + (b.y % 60)}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}
