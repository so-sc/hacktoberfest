import { ImageResponse } from "next/og";

export const alt = "SOSC Hacktoberfest 2026: open PRs all October";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// same idea as the landing: green pixel fire licking in from both sides, white centre
const SHADES = ["#0ade4a", "#3ce56e", "#6aeb8f", "#95f1b0", "#c0f6d0"];
const T = 35; // tile size
const ROWS = Math.ceil(630 / T);
const flame = (r: number, side: number) => 3 + Math.round(2.2 * Math.sin(r * 0.6 + side * 2) + 1.3 * Math.sin(r * 1.7 + side));

function Side({ side }: { side: 0 | 1 }) {
  return (
    <div style={{ position: "absolute", top: 0, [side ? "right" : "left"]: 0, display: "flex", flexDirection: "column" }}>
      {Array.from({ length: ROWS }, (_, r) => {
        const len = flame(r, side);
        return (
          <div key={r} style={{ display: "flex", flexDirection: side ? "row-reverse" : "row" }}>
            {Array.from({ length: len }, (_, d) => (
              <div key={d} style={{ width: T, height: T, background: SHADES[Math.min(SHADES.length - 1, Math.floor((d / len) * SHADES.length))] }} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          position: "relative",
        }}
      >
        <Side side={0} />
        <Side side={1} />
        <div style={{ fontSize: 30, color: "#4b5d4f", letterSpacing: 6 }}>SOSC PRESENTS</div>
        <div style={{ fontSize: 112, fontWeight: 800, color: "#0b0b0b", letterSpacing: -2, marginTop: 8 }}>HACKTOBERFEST</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: "#0ade4a", marginTop: -12 }}>2026</div>
        <div style={{ fontSize: 30, color: "#0b0b0b", marginTop: 24 }}>Open PRs all October · log them before 31 Oct</div>
      </div>
    ),
    size,
  );
}
