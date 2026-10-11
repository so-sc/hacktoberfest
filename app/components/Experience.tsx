"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { DEADLINE } from "@/lib/pr";
import { useClock } from "@/lib/clock";
import { Alien, hop } from "./Alien";
import { Pieces } from "./Assets";
import { buildWall } from "./fire";
import { SubmissionPanel } from "./SubmissionPanel";

gsap.registerPlugin(useGSAP, SplitText);

const rand = gsap.utils.random;
const num = (el: Element, key: string) => Number((el as HTMLElement).dataset[key] ?? 0);

export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"landing" | "form">("landing");
  const tl = useRef<gsap.core.Timeline | null>(null);
  const reduced = useRef(false);
  const landing = useRef(true);
  const masks = useRef<Element[]>([]);

  const { contextSafe } = useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const split = SplitText.create(q("[data-title]")[0], { type: "chars", mask: "chars" });
      masks.current = split.masks;

      // the fire and piece layout are measured from the real content box, so build before animating
      buildWall(root.current!);
      let resizeId = 0;
      const onResize = () => {
        clearTimeout(resizeId);
        resizeId = window.setTimeout(() => landing.current && buildWall(root.current!), 150);
      };
      addEventListener("resize", onResize);

      // no intro: the page simply loads in place. Motion is only for the git-push transition.
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        reduced.current = !(ctx.conditions as { motion: boolean }).motion;
      });

      return () => removeEventListener("resize", onResize);
    },
    { scope: root },
  );

  /* ---- git push: the page empties from the centre outward, each kind of thing leaving its own way ---- */
  const open = () =>
    contextSafe(() => {
      const r = root.current!;
      const q = gsap.utils.selector(r);
      const cta = q("[data-cta]")[0];
      const panel = q("[data-panel]")[0];
      const b = cta.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const W = innerWidth;
      const H = innerHeight;
      const diag = Math.hypot(W, H);

      tl.current?.kill();
      landing.current = false;
      setView("form");

      const t = gsap.timeline({
        onComplete: () => (q("[data-panel-focus]")[0] as HTMLElement | undefined)?.focus(),
        onReverseComplete: () => {
          gsap.set(panel, { autoAlpha: 0 });
          landing.current = true;
          setView("landing");
          buildWall(r); // catch any resize that happened while the form was open
          (cta.querySelector("button") as HTMLElement).focus();
        },
      });
      tl.current = t;

      if (reduced.current) {
        t.to(q("[data-landing]"), { autoAlpha: 0, duration: 0.25 }).fromTo(
          panel,
          { autoAlpha: 0, clipPath: "none" },
          { autoAlpha: 1, duration: 0.25 },
        );
        return;
      }

      // CTA: a press, then gone
      t.to(cta, { scale: 0.94, duration: 0.12, ease: "power2.out" }, 0).to(
        cta,
        { scale: 0.7, autoAlpha: 0, duration: 0.3, ease: "power2.in" },
        0.12,
      );

      // title: letters part from the middle and fall away to their own side
      const mid = (masks.current.length - 1) / 2;
      masks.current.forEach((el, i) => {
        const off = i - mid;
        const dir = Math.sign(off) || (Math.random() < 0.5 ? -1 : 1);
        t.to(
          el,
          {
            x: dir * (W * 0.55 + Math.abs(off) * 30),
            y: rand(40, 220),
            rotation: dir * rand(25, 80),
            opacity: 0,
            duration: 0.95,
            ease: "power3.in",
          },
          0.1 + (Math.abs(off) / Math.max(mid, 1)) * 0.3,
        );
      });

      // "2026" lifts away; the rails retract to the edges
      t.to(
        q("[data-year]"),
        { opacity: 0, y: -30, duration: 0.7, ease: "power2.in" },
        0.15,
      )
        .to(q("[data-rail]")[0], { scaleX: 0, transformOrigin: "0% 50%", duration: 0.6, ease: "power2.in" }, 0.15)
        .to(q("[data-rail]")[1], { scaleX: 0, transformOrigin: "100% 50%", duration: 0.6, ease: "power2.in" }, 0.15)
        .to(q("[data-tagline]"), { y: 40, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.in" }, 0.2)
        .to(q("[data-logo]"), { y: -40, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.15);

      // alien: voxels burst away from its own centre
      const alienSvg = r.querySelector<SVGSVGElement>("[data-hero-alien] svg")!;
      const ab = alienSvg.getBoundingClientRect();
      const unit = ab.width / alienSvg.viewBox.baseVal.width; // px per svg unit
      q("[data-px]").forEach((el) => {
        const pb = el.getBoundingClientRect();
        const a = Math.atan2(pb.top - (ab.top + ab.height / 2), pb.left - (ab.left + ab.width / 2));
        const reach = (diag * rand(0.6, 1)) / unit;
        t.to(
          el,
          {
            x: Math.cos(a) * reach,
            y: Math.sin(a) * reach,
            rotation: rand(-220, 220),
            scale: 1.4,
            opacity: 0,
            duration: 0.9,
            ease: "power3.in",
          },
          0.2 + rand(0, 0.25),
        );
      });
      t.to(q("[data-alien-shadow]"), { opacity: 0, scaleX: 0, duration: 0.4, ease: "power2.in" }, 0.2);

      // assets are flung outward; the inner ones go first
      const assets = q("[data-asset]").map((el) => {
        const rc = el.getBoundingClientRect();
        const dx = rc.left + rc.width / 2 - cx;
        const dy = rc.top + rc.height / 2 - cy;
        return { el, a: Math.atan2(dy, dx), dist: Math.hypot(dx, dy) };
      });
      const maxDist = Math.max(...assets.map((a) => a.dist), 1);
      assets.forEach(({ el, a, dist }) => {
        t.to(
          el,
          {
            x: Math.cos(a) * diag * 0.8,
            y: Math.sin(a) * diag * 0.8,
            rotation: rand(-200, 200),
            opacity: 0,
            duration: rand(0.9, 1.1),
            ease: "power3.in",
          },
          0.35 + (dist / maxDist) * 0.5,
        );
      });

      // the fire burns down: tips and embers die first, each pixel flickering before it goes out,
      // and the flames shrink back into the edges they came from
      q("[data-fire] > span").forEach((el) => {
        const d = num(el, "d");
        const len = Math.max(1, num(el, "len"));
        const out = num(el, "side") ? 1 : -1;
        if (d >= len) {
          // embers drift up and away
          t.to(el, { y: -rand(30, 90), x: out * rand(0, 24), opacity: 0, duration: 0.7, ease: "power1.in" }, 0.35 + rand(0, 0.2));
          return;
        }
        t.to(
          el,
          {
            keyframes: [
              { opacity: 0.35, duration: 0.07 },
              { opacity: 0.95, duration: 0.07 },
              { opacity: 0, scale: 0.45, x: out * 14, duration: 0.3, ease: "power2.in" },
            ],
          },
          0.45 + (1 - d / len) * 0.75 + rand(0, 0.12),
        );
      });

      // the form opens out of the button
      t.fromTo(
        panel,
        { autoAlpha: 1, clipPath: `circle(0px at ${cx}px ${cy}px)` },
        { clipPath: `circle(${diag}px at ${cx}px ${cy}px)`, duration: 0.95, ease: "power3.inOut" },
        1.3,
      )
        .fromTo(
          q("[data-panel-item]"),
          { y: 28, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07, ease: "expo.out" },
          1.8,
        );
    })();

  // reversing the ease-ins plays them as ease-outs: everything settles back into place
  const close = () => contextSafe(() => tl.current?.timeScale(1.5).reverse())();

  return (
    <div
      ref={root}
      // --t (fire tile size) is set by buildWall from the viewport; this is only the pre-hydration default
      className="relative h-dvh overflow-hidden bg-paper [--t:32px]"
    >
      <div data-stage className="absolute inset-0">
        <div data-landing inert={view === "form"} className="absolute inset-0">
          <div data-fire aria-hidden className="pointer-events-none absolute inset-0" />
          <Pieces />

          <main className="relative z-10 grid h-full place-items-center px-4">
            <div data-content className="flex flex-col items-center text-center">
              <button
                type="button"
                data-hero-alien
                aria-label="Poke the alien"
                onClick={(e) => hop(e.currentTarget.querySelector("svg"))}
                className="cursor-pointer rounded-md"
              >
                <Alien pixels className="w-[clamp(64px,min(22vw,13vh),156px)] drop-shadow-[0_14px_18px_rgb(17_115_47/0.25)]" />
              </button>
              <div aria-hidden className="-mt-1 h-3 w-[clamp(48px,min(16vw,9vh),110px)]">
                <div data-alien-shadow className="size-full rounded-[50%] bg-ink/15 blur-md" />
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img data-logo src="/sosc-logo.svg" alt="SOSC" className="mt-[clamp(0.4rem,1.6vh,1.1rem)] h-[clamp(20px,3.4vh,32px)] w-auto" />

              <h1 className="mt-[clamp(0.4rem,1.4vh,1rem)] flex flex-col items-center">
                <span
                  data-title
                  className="font-display text-[clamp(2rem,min(8.6vw,10vh),6rem)] leading-[0.95] tracking-[-0.01em] uppercase"
                >
                  Hacktoberfest
                </span>
                <span className="mt-1 flex w-full items-center gap-3 md:gap-5">
                  <Rail side="left" />
                  <span
                    data-year
                    className="font-display text-[clamp(1.75rem,min(6vw,7vh),4.5rem)] leading-none text-neon tabular-nums"
                  >
                    2026
                  </span>
                  <Rail side="right" />
                </span>
              </h1>

              <p data-tagline className="mt-[clamp(0.5rem,2vh,1.5rem)] font-display text-lg md:text-2xl">
                May the source be with you.
              </p>
              <Subline />

              <div data-cta className="relative mt-[clamp(0.9rem,3vh,2.25rem)]">
                <button
                  type="button"
                  onClick={open}
                  // flat call to action: label, a pixel arrow and a pixel underline, no box
                  className="group relative inline-flex min-h-12 cursor-pointer flex-col items-start gap-2 text-left"
                >
                  <span className="flex items-center gap-3 font-display text-2xl text-ink md:text-3xl">
                    Get started
                    <PixelArrow className="h-[0.8em] w-auto text-neon-2 transition-transform duration-300 ease-out group-hover:translate-x-2" />
                  </span>
                  <span
                    aria-hidden
                    className="h-1.5 w-full bg-[repeating-linear-gradient(to_right,var(--color-neon)_0_6px,transparent_6px_10px)] transition-opacity duration-200 group-hover:opacity-70"
                  />
                </button>
              </div>
            </div>
          </main>
        </div>

        <SubmissionPanel active={view === "form"} onBack={close} />
      </div>
    </div>
  );
}

/** arrow drawn on the same square grid as the fire */
function PixelArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 7" className={className} shapeRendering="crispEdges" aria-hidden>
      <path fill="currentColor" d="M4 0h1v1h-1zM4 1h1v1h-1zM5 1h1v1h-1zM0 2h1v1h-1zM1 2h1v1h-1zM2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM0 3h1v1h-1zM1 3h1v1h-1zM2 3h1v1h-1zM3 3h1v1h-1zM4 3h1v1h-1zM5 3h1v1h-1zM6 3h1v1h-1zM7 3h1v1h-1zM0 4h1v1h-1zM1 4h1v1h-1zM2 4h1v1h-1zM3 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM4 6h1v1h-1z" />
    </svg>
  );
}

function Rail({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      data-rail
      className={`flex flex-1 items-center ${side === "left" ? "origin-right flex-row" : "origin-left flex-row-reverse"}`}
    >
      <span
        className={`h-0.5 flex-1 from-transparent to-forest/70 ${side === "left" ? "bg-linear-to-r" : "bg-linear-to-l"}`}
      />
      <span className="size-3 shrink-0 rounded-full border-2 border-forest bg-neon" />
      <span className="h-0.5 w-3 bg-forest/70 md:w-5" />
    </span>
  );
}


function Subline() {
  const closed = useClock((now) => now >= DEADLINE, false);
  return (
    <p data-tagline className="mt-1.5 max-w-[60ch] text-sm text-pretty text-muted md:text-base">
      {closed
        ? "Submissions closed on 31 Oct. Thanks for shipping with SOSC!"
        : "Open PRs all October and log every one here. Closes 31 Oct, 11:59 PM IST."}
    </p>
  );
}
