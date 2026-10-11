import { useId } from "react";
import { gsap } from "gsap";

// Traced from the event mascot reference: antennae, hollow eyes, hanging arms, two legs.
const MAP = [
  ".X.........X.",
  "..X.......X..",
  "...XXXXXXX...",
  "..XXXXXXXXX..",
  ".XXX..X..XXX.",
  ".XXX..X..XXX.",
  "XXXXXXXXXXXXX",
  "X.XXXXXXXXX.X",
  "X..XX...XX..X",
  "X..XX...XX..X",
];
const C = 10; // cell size in svg units
const W = MAP[0].length * C;
const H = MAP.length * C;
const on = (x: number, y: number) => MAP[y]?.[x] === "X";

// Painter's order for an up-right depth axis: bottom row first, left to right,
// so nearer faces always paint over the sides of cubes behind them.
const PIXELS = MAP.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === "X" ? [{ x, y, top: !on(x, y - 1), side: !on(x + 1, y) }] : [])),
).sort((a, b) => b.y - a.y || a.x - b.x);

// one light source across the whole figure: bright crown, saturated body, deep feet
const TONE = { face: ["#a4f7bc", "#3ce56e", "#18c450"], top: ["#b9f9cb", "#6aeb8f"], side: ["#20b04f", "#11732f"] };

type Props = {
  className?: string;
  /** mark each voxel with data-px so the hero can assemble/scatter them */
  pixels?: boolean;
  /** voxel depth, projected up-right; keep it shallow at small sizes or the seams turn to noise */
  depth?: number;
};

export function Alien({ className, pixels, depth: D = 4 }: Props) {
  const id = useId().replace(/[^\w-]/g, "");
  const t = TONE;
  return (
    <svg viewBox={`-1 ${-D - 1} ${W + D + 2} ${H + D + 2}`} className={className} overflow="visible" aria-hidden>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={t.face[0]} />
          <stop offset="0.35" stopColor={t.face[1]} />
          <stop offset="1" stopColor={t.face[2]} />
        </linearGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={t.top[0]} />
          <stop offset="1" stopColor={t.top[1]} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.side[0]} />
          <stop offset="1" stopColor={t.side[1]} />
        </linearGradient>
      </defs>
      {PIXELS.map(({ x, y, top, side }) => {
        const px = x * C;
        const py = y * C;
        return (
          <g key={`${x}-${y}`} data-px={pixels ? "" : undefined}>
            {side && (
              <path d={`M${px + C} ${py}l${D} ${-D}v${C}l${-D} ${D}z`} fill={`url(#${id}s)`} />
            )}
            {top && <path d={`M${px} ${py}l${D} ${-D}h${C}l${-D} ${D}z`} fill={`url(#${id}t)`} />}
            <rect x={px} y={py} width={C + 0.25} height={C + 0.25} fill={`url(#${id}f)`} />
            {/* specular glint on the lit crown only, so the body reads as one glossy object */}
            {top && D > 2 && <rect x={px + 1.6} y={py + 1.6} width={3.2} height={1.6} rx={0.8} fill="#fff" opacity={0.7} />}
          </g>
        );
      })}
    </svg>
  );
}

/** Squash-and-stretch hop on click. */
export function hop(el: Element | null) {
  if (!el) return;
  gsap
    .timeline({ defaults: { transformOrigin: "50% 100%" } })
    .to(el, { scaleX: 1.14, scaleY: 0.8, duration: 0.12, ease: "power2.out" })
    .to(el, { scaleX: 0.92, scaleY: 1.1, y: -30, duration: 0.28, ease: "power3.out" })
    .to(el, { scaleX: 1, scaleY: 1, y: 0, duration: 0.45, ease: "bounce.out" });
}

