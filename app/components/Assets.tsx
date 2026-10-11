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

const PrIcon = ({ className }: { className?: string }) => (
  <Icon className={className} d="M18 15.75V10a3 3 0 0 0-3-3h-4.5M13 4.5 10.5 7 13 9.5">
    <path d="M6 8.25v7.5" stroke={INK} />
    <circle cx="6" cy="6" r="2.25" stroke={INK} />
    <circle cx="6" cy="18" r="2.25" stroke={INK} />
    <circle cx="18" cy="18" r="2.25" />
  </Icon>
);
const BranchIcon = ({ className }: { className?: string }) => (
  <Icon className={className} d="M6 8.25v7.5M18 8.25c0 4.5-6 4-10.4 8.2">
    <circle cx="6" cy="6" r="2.25" />
    <circle cx="6" cy="18" r="2.25" stroke={INK} />
    <circle cx="18" cy="6" r="2.25" stroke={INK} />
  </Icon>
);
const CommitIcon = ({ className }: { className?: string }) => (
  <Icon className={className} d="M2 12h6M16 12h6">
    <circle cx="12" cy="12" r="4" stroke={INK} />
  </Icon>
);

/** pixel sparkle, same voxel language as the alien */
const Sparkle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 5 5" className={className} aria-hidden shapeRendering="crispEdges">
    <path fill="currentColor" d="M2 0h1v2h2v1H3v2H2V3H0V2h2z" />
  </svg>
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


// a pool of pieces at one modest size; buildWall spreads as many as the white space comfortably holds
const ICON = "size-[calc(var(--t)*1.3)] text-neon-2";
const TYPE = "text-[calc(var(--t)*1.15)]";

const PIECES: ReactNode[] = [
  <Glyph key="code" size={TYPE} parts={[["<", "g"], ["/", "k"], [">", "g"]]} />,
  <BranchIcon key="branch" className={ICON} />,
  <Glyph key="braces" size={TYPE} parts={[["{", "g"], ["·", "k"], ["}", "g"]]} />,
  <PrIcon key="pr" className={ICON} />,
  <Glyph key="arrow" size={TYPE} parts={[["=", "g"], [">", "k"]]} />,
  <CommitIcon key="commit" className={ICON} />,
  <Sparkle key="spark" className="size-[calc(var(--t)*0.8)] text-neon" />,
  <Glyph key="and" size={TYPE} parts={[["&", "g"], ["&", "k"]]} />,
  <PrIcon key="pr2" className={ICON} />,
  <Glyph key="hash" size={TYPE} parts={[["#", "g"], ["!", "k"]]} />,
  <BranchIcon key="branch2" className={ICON} />,
  <Glyph key="inc" size={TYPE} parts={[["+", "g"], ["+", "k"]]} />,
  <Sparkle key="spark2" className="size-[calc(var(--t)*0.8)] text-ink" />,
  <Glyph key="cmt" size={TYPE} parts={[["/", "k"], ["/", "g"]]} />,
  <CommitIcon key="commit2" className={ICON} />,
  <Glyph key="prompt" size={TYPE} parts={[["$", "g"], ["_", "k"]]} />,
];

export function Pieces() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {PIECES.map((el, i) => (
        <div key={i} data-asset className="invisible absolute top-0 left-0">
          {el}
        </div>
      ))}
    </div>
  );
}
