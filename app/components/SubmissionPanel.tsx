"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import { getRedirectResult, onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { DomainError, fb, firebaseConfigured, signIn } from "@/lib/firebase";
import { ALLOWED_DOMAIN, DEADLINE, isAllowedEmail, parsePrUrl, type ParsedPr, type ProjectType } from "@/lib/pr";
import { useClock } from "@/lib/clock";
import { Alien, hop } from "./Alien";
import { Icon } from "./Assets";

type Submission = {
  id: string;
  prUrl: string;
  owner: string;
  repo: string;
  number: number;
  type: ProjectType;
  createdAt: Timestamp | null;
};

const TYPE_LABEL: Record<ProjectType, string> = { sosc: "SOSC project", external: "External project" };

/* ---------- data ---------- */

function friendly(e: unknown): string {
  if (e instanceof Error && !("code" in e)) return e.message;
  const code = (e as { code?: string }).code ?? "";
  if (code.includes("permission-denied"))
    return Date.now() >= DEADLINE ? "Submissions are closed." : "That wasn't allowed. Try signing out and back in.";
  if (code.includes("unavailable")) return "You seem to be offline. Check your connection and try again.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  return "Something went wrong. Try again in a moment.";
}

/** Throws a readable error if the PR id is already taken. */
async function assertFree(p: ParsedPr) {
  const ref = doc(fb().db, "submissions", p.id);
  try {
    if ((await getDoc(ref)).exists()) throw new Error("You've already logged this PR. Edit it under My submissions.");
  } catch (e) {
    // rules only hide docs that belong to someone else
    if ((e as { code?: string }).code === "permission-denied") throw new Error("Someone has already logged this PR.");
    throw e;
  }
  return ref;
}

const fields = (p: ParsedPr, type: ProjectType) => ({
  prUrl: p.url,
  owner: p.owner,
  repo: p.repo,
  number: p.number,
  type,
  updatedAt: serverTimestamp(),
});

async function createSubmission(user: User, p: ParsedPr, type: ProjectType) {
  const ref = await assertFree(p);
  await setDoc(ref, { uid: user.uid, email: user.email, ...fields(p, type), createdAt: serverTimestamp() });
}

async function updateSubmission(user: User, old: Submission, p: ParsedPr, type: ProjectType) {
  const { db } = fb();
  if (p.id === old.id) return updateDoc(doc(db, "submissions", old.id), fields(p, type));
  // the doc id is the PR, so a new URL means a new doc
  const ref = await assertFree(p);
  const batch = writeBatch(db);
  batch.delete(doc(db, "submissions", old.id));
  batch.set(ref, { uid: user.uid, email: user.email, ...fields(p, type), createdAt: serverTimestamp() });
  await batch.commit();
}

/* ---------- panel ---------- */

export function SubmissionPanel({
  active,
  onBack,
  standalone = false,
}: {
  active: boolean;
  onBack: () => void;
  /** rendered as its own page (/submit) instead of revealed over the landing */
  standalone?: boolean;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"submit" | "mine">("submit");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const closed = useClock((now) => now >= DEADLINE, false);
  const alienRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const { auth } = fb();
    getRedirectResult(auth).catch((e) => setAuthError(friendly(e)));
    return onAuthStateChanged(auth, (u) => {
      if (u && !isAllowedEmail(u.email)) {
        setAuthError(`Use your @${ALLOWED_DOMAIN} Google account.`);
        signOut(auth);
        return;
      }
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(fb().db, "submissions"), where("uid", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setItems(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: "estimate" }) as Omit<Submission, "id">) }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        ),
      () => setItems([]),
    );
    return () => {
      unsub();
      setItems(null);
    };
  }, [user]);

  // badges/{email} is written by badges/sync.mjs for participants who earned one
  useEffect(() => {
    if (!user?.email) return;
    getDoc(doc(fb().db, "badges", user.email.toLowerCase()))
      .then((d) => setBadge(d.exists() ? (d.get("fileId") as string) : null))
      .catch(() => setBadge(null));
    return () => setBadge(null);
  }, [user]);

  async function onSignIn() {
    setAuthError("");
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      setAuthError(e instanceof DomainError ? `Use your @${ALLOWED_DOMAIN} Google account.` : friendly(e));
    } finally {
      setBusy(false);
    }
  }

  const celebrate = (from: Element | null) => {
    hop(alienRef.current?.querySelector("svg") ?? null);
    burst(from);
  };

  return (
    <section
      data-panel
      aria-label="Submit your pull requests"
      inert={!active}
      onKeyDown={(e) => e.key === "Escape" && onBack()}
      className={`absolute inset-0 z-30 overflow-y-auto bg-paper ${standalone ? "" : "invisible"}`}
    >
      <div className="relative mx-auto flex w-full max-w-xl flex-col px-4 pt-8 pb-16 md:pt-[12vh]">
        <div data-panel-item className="flex items-center justify-between gap-3 font-mono text-xs text-muted">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[3px] px-2 tracking-[0.12em] uppercase transition-colors hover:text-ink"
          >
            <Icon d="M19 12H5M11 6l-6 6 6 6" className="size-4" />
            Back
          </button>
          {user && (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-ink/80">{user.email}</span>
              <button
                type="button"
                onClick={() => signOut(fb().auth)}
                className="min-h-10 shrink-0 cursor-pointer tracking-[0.12em] uppercase underline-offset-4 transition-colors hover:text-ink hover:underline decoration-neon decoration-2"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <div data-panel-item className="mt-8 md:mt-10">
          <div className="flex items-center gap-3">
            <span ref={alienRef} className="inline-block">
              <Alien depth={2} className="w-8" />
            </span>
            <span className="font-mono text-xs text-muted">sosc@hacktoberfest:~/prs</span>
          </div>

          <div className="mt-5">
            <h2 tabIndex={-1} data-panel-focus className="font-display text-3xl outline-none md:text-4xl">
              Log your PRs
            </h2>
            <p className="mt-2 text-sm text-pretty text-muted md:text-base">
              Every pull request you open in October counts, on SOSC repos or anywhere else on GitHub.
            </p>

            {!firebaseConfigured ? (
              <Notice>
                Firebase isn&apos;t configured. Copy <code className="text-ink">.env.example</code> to{" "}
                <code className="text-ink">.env</code> and fill in your project keys.
              </Notice>
            ) : user === undefined ? (
              <div className="mt-8 h-12 animate-pulse rounded-[4px] bg-paper-2" aria-label="Checking your session" />
            ) : user === null ? (
              <div className="mt-7">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={busy}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[4px] bg-ink px-5 font-medium text-paper transition-[background-color,transform] hover:bg-ink/85 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                >
                  <GoogleG />
                  {busy ? "Opening Google…" : "Continue with Google"}
                </button>
                <p className="mt-3 text-center font-mono text-xs text-muted">
                  Only @{ALLOWED_DOMAIN} accounts can sign in.
                </p>
                {authError && <ErrorText>{authError}</ErrorText>}
              </div>
            ) : (
              <>
                {badge && (
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${badge}`}
                    className="mt-7 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-neon px-5 font-display text-lg text-ink transition-[background-color,transform] hover:bg-neon-2 active:scale-[0.98]"
                  >
                    <Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" className="size-5" />
                    Download your badge
                  </a>
                )}
                <Tabs
                  tab={tab}
                  setTab={setTab}
                  count={items?.length}
                  submit={
                    closed ? (
                      <Notice>Submissions closed on 31 Oct. Thanks for shipping with SOSC!</Notice>
                    ) : (
                      <PrForm
                        submitLabel="Submit PR"
                        busyLabel="Submitting…"
                        onSubmit={async (p, type, btn) => {
                          await createSubmission(user, p, type);
                          celebrate(btn);
                          return `Logged ${p.owner}/${p.repo}#${p.number}. Got another?`;
                        }}
                      />
                    )
                  }
                  mine={
                    <SubmissionList
                      items={items}
                      readOnly={closed}
                      onEmpty={() => setTab("submit")}
                      onUpdate={(old, p, type) => updateSubmission(user, old, p, type)}
                    />
                  }
                />
              </>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

/* ---------- tabs ---------- */

function Tabs({
  tab,
  setTab,
  count,
  submit,
  mine,
}: {
  tab: "submit" | "mine";
  setTab: (t: "submit" | "mine") => void;
  count?: number;
  submit: ReactNode;
  mine: ReactNode;
}) {
  const tabs = [
    { id: "submit", label: "Submit a PR" },
    { id: "mine", label: "My submissions" },
  ] as const;
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = tab === "submit" ? "mine" : "submit";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Submissions" onKeyDown={onKey} className="relative grid grid-cols-2 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink aria-selected:text-ink"
          >
            {t.label}
            {t.id === "mine" && count !== undefined && (
              <span className="font-mono text-[11px] text-muted tabular-nums">{count}</span>
            )}
          </button>
        ))}
        <span
          aria-hidden
          className="absolute -bottom-px left-0 h-0.5 w-1/2 bg-neon transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(${tab === "mine" ? 100 : 0}%)` }}
        />
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id} className="pt-6">
          {t.id === "submit" ? submit : mine}
        </div>
      ))}
    </div>
  );
}

/* ---------- form (create + edit) ---------- */

function PrForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { url: string; type: ProjectType };
  submitLabel: string;
  busyLabel: string;
  /** resolves to an optional success message */
  onSubmit: (p: ParsedPr, type: ProjectType, btn: HTMLButtonElement | null) => Promise<string | void>;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [type, setType] = useState<ProjectType | "">(initial?.type ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const uid = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setDone("");
    const p = parsePrUrl(url);
    if (!p) return setError("That doesn't look like a GitHub pull request link. It should look like github.com/owner/repo/pull/123.");
    if (!type) return setError("Pick whether this is a SOSC project or an external one.");
    setError("");
    setBusy(true);
    try {
      const msg = await onSubmit(p, type, btn.current);
      if (!initial) {
        setUrl("");
        setType("");
      }
      if (msg) setDone(msg);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const input =
    // flat field: a single rule underneath; focus darkens it and adds a neon underline
    "mt-1 block min-h-12 w-full border-0 border-b border-ink/25 bg-transparent px-0 text-[16px] text-ink transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-ink/50 focus:border-ink focus:shadow-[0_2px_0_0_var(--color-neon)] focus:outline-none focus-visible:outline-none";

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Pull request URL</span>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          aria-invalid={!!error && !parsePrUrl(url)}
          aria-describedby={error ? `err-${uid}` : undefined}
          className={`${input} font-mono text-sm md:text-[15px]`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Project</span>
        <select
          required
          value={type}
          onChange={(e) => setType(e.target.value as ProjectType)}
          className={`${input} select pr-8 ${type ? "" : "text-muted"}`}
        >
          <option value="" disabled>
            Choose one
          </option>
          <option value="sosc">{TYPE_LABEL.sosc}</option>
          <option value="external">{TYPE_LABEL.external}</option>
        </select>
      </label>

      {error && <ErrorText id={`err-${uid}`}>{error}</ErrorText>}

      <div className="flex gap-3">
        <button
          ref={btn}
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-neon px-5 font-display text-lg text-ink transition-[background-color,transform] hover:bg-neon-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 cursor-pointer px-4 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Cancel
          </button>
        )}
      </div>

      <p role="status" className="min-h-5 text-sm font-medium text-ink">
        {done}
      </p>
    </form>
  );
}

/* ---------- list ---------- */

function SubmissionList({
  items,
  readOnly,
  onEmpty,
  onUpdate,
}: {
  items: Submission[] | null;
  readOnly: boolean;
  onEmpty: () => void;
  onUpdate: (old: Submission, p: ParsedPr, type: ProjectType) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!items)
    return (
      <div className="space-y-3" aria-label="Loading your submissions">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[4px] bg-paper-2" />
        ))}
      </div>
    );

  if (!items.length)
    return (
      <div className="py-6 text-center">
        <p className="text-ink">No PRs yet.</p>
        <p className="mt-1 text-sm text-muted">Go break something (responsibly), then log it here.</p>
        {!readOnly && (
          <button
            type="button"
            onClick={onEmpty}
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink underline decoration-neon decoration-2 underline-offset-4"
          >
            Submit your first PR
          </button>
        )}
      </div>
    );

  async function remove(id: string) {
    setError("");
    try {
      await deleteDoc(doc(fb().db, "submissions", id));
    } catch (e) {
      setError(friendly(e));
    }
    setConfirming(null);
  }

  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      {/* git log: one commit node per PR on a neon rail */}
      <ul className="relative -mt-2 before:absolute before:top-6 before:bottom-6 before:left-[5px] before:w-0.5 before:bg-neon/60">
        {items.map((s) => (
          <li key={s.id} className="relative py-4 pl-8">
            <span aria-hidden className="absolute top-[22px] left-0 size-3 rounded-full border-2 border-neon bg-paper" />
            {editing === s.id ? (
              <PrForm
                initial={{ url: s.prUrl, type: s.type }}
                submitLabel="Save"
                busyLabel="Saving…"
                onCancel={() => setEditing(null)}
                onSubmit={async (p, type) => {
                  await onUpdate(s, p, type);
                  setEditing(null);
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={s.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm break-all text-ink decoration-neon decoration-2 underline-offset-4 hover:underline"
                  >
                    {s.owner}/{s.repo}
                    <span className="font-semibold">#{s.number}</span>
                  </a>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5 font-mono text-ink/80">
                      <span className={`size-1.5 rounded-full ${s.type === "sosc" ? "bg-neon" : "bg-ink/30"}`} />
                      {s.type === "sosc" ? "SOSC" : "External"}
                    </span>
                    {s.createdAt && (
                      <span>· {s.createdAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    )}
                  </div>
                </div>

                {!readOnly &&
                  (confirming === s.id ? (
                    <div className="flex shrink-0 items-center gap-1 text-sm">
                      <span className="mr-1 text-muted">Delete?</span>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="min-h-10 cursor-pointer rounded-[3px] px-2.5 text-danger hover:bg-danger/10"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="min-h-10 cursor-pointer rounded-[3px] px-2.5 text-muted hover:text-ink"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0">
                      <IconButton label={`Edit ${s.owner}/${s.repo}#${s.number}`} onClick={() => setEditing(s.id)}>
                        <Icon d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17zM13.5 8.5l3 3" className="size-[18px]" />
                      </IconButton>
                      <IconButton label={`Delete ${s.owner}/${s.repo}#${s.number}`} onClick={() => setConfirming(s.id)}>
                        <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" className="size-[18px]" />
                      </IconButton>
                    </div>
                  ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- bits ---------- */

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 cursor-pointer place-items-center rounded-[3px] text-muted transition-colors hover:bg-paper-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-sm text-muted">{children}</p>;
}

function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-3 text-sm text-danger">
      {children}
    </p>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** pixel confetti from the submit button */
function burst(from: Element | null) {
  if (!from || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = from.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const px = document.createElement("span");
    px.className = `pointer-events-none fixed z-50 size-2 ${i % 3 ? "bg-neon" : "bg-neon-2"}`;
    Object.assign(px.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` });
    document.body.appendChild(px);
    const a = Math.random() * Math.PI * 2;
    const d = gsap.utils.random(60, 160);
    gsap.to(px, {
      x: Math.cos(a) * d,
      y: Math.sin(a) * d - 40,
      rotation: gsap.utils.random(-180, 180),
      opacity: 0,
      duration: gsap.utils.random(0.6, 1),
      ease: "expo.out",
      onComplete: () => px.remove(),
    });
  }
}
