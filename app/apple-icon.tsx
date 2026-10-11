import { ImageResponse } from "next/og";
import { MAP } from "./components/Alien";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// home-screen icon: the pixel alien on white, same drawing as icon.svg
// one path for the whole sprite, so there are no seams between squares
const sprite = MAP.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "X" ? [`M${x} ${y}h1v1h-1z`] : []))).join("");

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <svg width="140" height="110" viewBox="0 0 13.6 10.6">
          <path d={sprite} fill="#11732f" transform="translate(0.6 0.6)" />
          <path d={sprite} fill="#3ce56e" />
        </svg>
      </div>
    ),
    size,
  );
}
