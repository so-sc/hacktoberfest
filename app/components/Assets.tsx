import type { ReactNode } from "react";

/* ---------- icons: one grammar, 24 grid, 1.75 stroke ---------- */

export function Icon({ d, className, children }: { d?: string; className?: string; children?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d && <path d={d} />}
      {children}
    </svg>
  );
}

// two-tone: the main stroke takes the piece's green (currentColor), accents are ink
const INK = "var(--color-ink)";



const BranchIcon = ({ className }: { className?: string }) => (
  <Icon className={className} d="M6 8.25v7.5M18 8.25c0 4.5-6 4-10.4 8.2">
    <circle cx="6" cy="6" r="2.25" />
    <circle cx="6" cy="18" r="2.25" stroke={INK} />
    <circle cx="18" cy="6" r="2.25" stroke={INK} />
  </Icon>
);
const PrIcon = ({ className }: { className?: string }) => (
  <Icon className={className} d="M18 15.75V10a3 3 0 0 0-3-3h-4.5M13 4.5 10.5 7 13 9.5">
    <path d="M6 8.25v7.5" stroke={INK} />
    <circle cx="6" cy="6" r="2.25" stroke={INK} />
    <circle cx="6" cy="18" r="2.25" stroke={INK} />
    <circle cx="18" cy="18" r="2.25" />
  </Icon>
);

/** code glyphs set in type: g = green part, k = ink part, e.g. "</>" as g"<" k"/" g">" */
const Glyph = ({ parts, size }: { parts: [string, "g" | "k"][]; size: string }) => (
  <span className={`inline-block font-mono leading-[1.25] font-bold whitespace-pre [font-variant-ligatures:none] ${size}`}>
    {parts.map(([t, c], i) => (
      <span key={i} className={c === "g" ? "text-neon-2" : "text-ink"}>
        {t}
      </span>
    ))}
  </span>
);


/* ---------- pieces ----------
   Green with ink accents. fire.ts spreads them through the white space, clear of the fire and content. */


// One piece per corner of the white area plus one above and one below the content, each tilted a little like a sticker (uneven angles read
// hand-placed rather than patterned). fire.ts anchors each to its corner.
const ICON = "size-[calc(var(--t)*1.8)] text-neon-2";
const TYPE = "text-[calc(var(--t)*1.6)]";

const PIECES: [corner: "tl" | "tr" | "bl" | "br" | "t" | "b", el: ReactNode, tilt: number][] = [
  ["tl", <Glyph key="braces" size={TYPE} parts={[["{", "g"], ["·", "k"], ["}", "g"]]} />, -9],
  ["tr", <PrIcon key="pr" className={ICON} />, 8],
  ["bl", <Glyph key="prompt" size={TYPE} parts={[[">", "g"], ["_", "k"]]} />, 6],
  ["br", <Glyph key="and" size={TYPE} parts={[["&", "g"], ["&", "k"]]} />, -11],
  ["t", <Glyph key="code" size={TYPE} parts={[["<", "g"], ["/", "k"], [">", "g"]]} />, 4],
  ["b", <BranchIcon key="branch" className={ICON} />, -6],
];

// small light-gray code crumbs that fill the gaps between everything else
const FILLERS: [text: string, tilt: number][] = [
  ["+", 0], [";", 8], ["//", -6], ["{}", 5], ["#", -10], ["0", 0], ["1", 6], ["~", -4],
  ["()", 7], ["*", 0], ["<>", -8], ["=", 4], ["$", -5], ["[]", 9], ["!", -3], ["01", 5],
  ["&", -7], ["%", 6], ["::", 0], ["?", -9], ["|", 4], ["^", -5], ["..", 0], ["@", 7],
  ["+", -6], ["-", 0], ["/*", 5], ["}", -8], ["{", 6], ["10", -4], ["#", 9], [">", 0],
  ["*/", -5], ["0x", 4], ["=>", -7], [";", 3],
];

export function Pieces() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {FILLERS.map(([text, tilt], i) => (
        <span
          key={i}
          data-filler
          style={{ rotate: `${tilt}deg` }}
          className="invisible absolute top-0 left-0 font-mono text-[calc(var(--t)*0.55)] leading-none font-bold text-[#d3d9d5] [font-variant-ligatures:none]"
        >
          {text}
        </span>
      ))}
      {PIECES.map(([corner, el, tilt]) => (
        <div key={corner} data-asset data-corner={corner} className="invisible absolute top-0 left-0">
          {/* tilt lives on the inner box so GSAP's exit rotation on the wrapper adds to it */}
          <div style={{ rotate: `${tilt}deg` }}>{el}</div>
        </div>
      ))}
    </div>
  );
}
