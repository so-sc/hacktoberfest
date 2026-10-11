/* Pixel fire licking in from the left and right edges, plus placement of the decorative pieces into
   whatever white space is left. Built from the real layout (content box, viewport) so the flames always
   stop short of the content and no piece can overlap anything. Deterministic: same viewport, same fire. */

function hash(a: number, b: number, c: number) {
  let h = Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(c + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// solid at the edge, cooling to pale tints at the tip
function heat(q: number, h: number) {
  const band =
    q < 0.4 ? ["#0ade4a", "#3ce56e"] : q < 0.65 ? ["#3ce56e", "#6aeb8f"] : q < 0.85 ? ["#6aeb8f", "#95f1b0"] : ["#95f1b0", "#c0f6d0"];
  return band[h < 0.5 ? 0 : 1];
}

export function buildWall(stage: HTMLElement) {
  const fire = stage.querySelector<HTMLElement>("[data-fire]")!;
  const content = stage.querySelector("[data-content]")!.getBoundingClientRect();
  const W = stage.clientWidth;
  const H = stage.clientHeight;

  // tile size follows the height so the wall keeps its proportions on short screens
  const t = Math.max(16, Math.min(44, Math.round(W < 768 ? H / 34 : H / 25)));
  stage.style.setProperty("--t", `${t}px`);

  // a grid centred on the viewport (edge cells may hang off-screen), so both sides are symmetric
  const C = Math.ceil(W / t) + 1;
  const R = Math.ceil(H / t) + 1;
  const x0 = (W - C * t) / 2;
  const y0 = (H - R * t) / 2;
  const half = Math.floor(C / 2);
  const occ = Array.from({ length: R }, () => new Array<boolean>(C).fill(false));
  const fill = (c0: number, r0: number, c1: number, r1: number) => {
    for (let r = Math.max(0, r0); r <= Math.min(R - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(C - 1, c1); c++) occ[r][c] = true;
  };

  // keep a margin of clear white around the content
  const pad = Math.max(12, t * 0.6);
  fill(
    Math.floor((content.left - pad - x0) / t),
    Math.floor((content.top - pad - y0) / t),
    Math.ceil((content.right + pad - x0) / t) - 1,
    Math.ceil((content.bottom + pad - y0) / t) - 1,
  );

  const tiles: HTMLElement[] = [];
  const put = (r: number, c: number, color: string, side: number, depth: number, len: number) => {
    const el = document.createElement("span");
    el.dataset.side = String(side);
    el.dataset.d = String(depth);
    el.dataset.len = String(len);
    Object.assign(el.style, {
      left: `${x0 + c * t}px`,
      top: `${y0 + r * t}px`,
      width: `${t}px`,
      height: `${t}px`,
      background: color,
    });
    tiles.push(el);
    occ[r][c] = true;
  };

  for (const side of [0, 1]) {
    const col = (d: number) => (side === 0 ? d : C - 1 - d);
    const phase = side === 0 ? 0.7 : 2.9;
    for (let r = 0; r < R; r++) {
      // how far this row can burn before it meets the content (or the centre line)
      let room = 0;
      while (room < half - 1 && !occ[r][col(room)]) room++;
      const edge = Math.abs(r / (R - 1) - 0.5) * 2; // 0 middle → 1 top/bottom
      const tongue =
        half * (0.17 + 0.1 * Math.sin(r * 0.52 + phase) + 0.06 * Math.sin(r * 1.41 + phase * 2) + 0.12 * edge * edge) +
        (hash(r, side, 1) - 0.5) * 3;
      const len = Math.max(0, Math.min(room - 1, Math.round(tongue)));
      for (let d = 0; d < len; d++) {
        const q = d / len;
        // ragged tip: holes become likelier toward the end of the flame
        if (q > 0.55 && hash(r, d, side + 7) < (q - 0.55) * 0.9) continue;
        put(r, col(d), heat(q, hash(r, d, side + 3)), side, d, len);
      }
      // embers drifting off the tip
      for (let k = 1; k <= 3; k++) {
        if (hash(r, k, side + 11) > 0.45 / k) continue;
        const d = len + k + (hash(r, k, side + 13) < 0.3 ? 1 : 0);
        if (d < room - 1) put(r, col(d), hash(r, k, side + 17) < 0.5 ? "#c0f6d0" : "#e2fbe9", side, d, len);
      }
    }
  }
  fire.replaceChildren(...tiles);

  /* pieces: spread through the white space, not pinned to spots. Each piece takes the free position that is
     farthest from everything already there (content, fire, earlier pieces), with a little hashed jitter so
     the result is even but not symmetric. Pieces stop once the best spot would crowd its neighbours. */
  const fireCells = tiles.map((el) => [
    Math.round((parseFloat(el.style.left) - x0) / t),
    Math.round((parseFloat(el.style.top) - y0) / t),
  ]);
  const halo = 2; // whole tiles of white kept between any piece and the flames
  const grid = occ.map((row) => row.slice());
  for (const [c, r] of fireCells)
    for (let y = Math.max(0, r - halo); y <= Math.min(R - 1, r + halo); y++)
      for (let x = Math.max(0, c - halo); x <= Math.min(C - 1, c + halo); x++) grid[y][x] = true;

  // distance (in cells) from each cell to the nearest obstacle: content box or fire
  const cx0 = (content.left - x0) / t, cx1 = (content.right - x0) / t;
  const cy0 = (content.top - y0) / t, cy1 = (content.bottom - y0) / t;
  const toContent = (x: number, y: number) => Math.hypot(Math.max(cx0 - x, 0, x - cx1), Math.max(cy0 - y, 0, y - cy1));
  const toFire = (x: number, y: number) => {
    let m = Infinity;
    for (const [c, r] of fireCells) m = Math.min(m, Math.hypot(c + 0.5 - x, r + 0.5 - y));
    return m;
  };
  const placed: [number, number][] = [];
  const minSpacing = 3.2; // cells between piece centres

  stage.querySelectorAll<HTMLElement>("[data-asset]").forEach((el, i) => {
    el.style.visibility = "hidden";
    const cw = Math.ceil((el.offsetWidth + t * 0.4) / t);
    const ch = Math.ceil((el.offsetHeight + t * 0.4) / t);
    let best: { c: number; r: number; d: number; score: number } | null = null;
    for (let r = 0; r + ch <= R; r++)
      for (let c = 0; c + cw <= C; c++) {
        // fully on screen and on free cells
        if (x0 + c * t < 0 || y0 + r * t < 0 || x0 + (c + cw) * t > W || y0 + (r + ch) * t > H) continue;
        let ok = true;
        for (let y = r; y < r + ch && ok; y++) for (let x = c; x < c + cw; x++) if (grid[y][x]) { ok = false; break; }
        if (!ok) continue;
        const mx = c + cw / 2, my = r + ch / 2;
        let d = Math.min(toContent(mx, my) * 1.4, toFire(mx, my));
        for (const [px, py] of placed) d = Math.min(d, Math.hypot(px - mx, py - my));
        const score = d + hash(c, r, i + 31) * 1.6; // jitter breaks symmetry
        if (!best || score > best.score) best = { c, r, d, score };
      }
    if (!best || best.d < minSpacing) return; // too crowded: leave it out
    const { c, r } = best;
    el.style.left = `${x0 + c * t + (cw * t - el.offsetWidth) / 2}px`;
    el.style.top = `${y0 + r * t + (ch * t - el.offsetHeight) / 2}px`;
    el.style.visibility = "visible";
    placed.push([c + cw / 2, r + ch / 2]);
    for (let y = r; y < r + ch; y++) for (let x = c; x < c + cw; x++) grid[y][x] = true;
  });
}
