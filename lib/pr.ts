// End of 31 Oct 2026, IST. Mirrored in firestore.rules.
export const DEADLINE = Date.parse("2026-11-01T00:00:00+05:30");
// Set in .env (gitignored); see .env.example. Empty = nobody can sign in (fail closed).
export const ALLOWED_DOMAIN = (process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "").trim().toLowerCase();

export type ProjectType = "sosc" | "external";
export type ParsedPr = { id: string; url: string; owner: string; repo: string; number: number };

const PR_PATH = /^\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:\/.*)?$/;

/** Accepts any github.com PR link (incl. /files, ?query, #hash) and returns its canonical form. */
export function parsePrUrl(input: string): ParsedPr | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !/^(www\.)?github\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(PR_PATH);
  if (!m) return null;
  const [, owner, repo, num] = m;
  const number = Number(num);
  if (!number) return null;
  return {
    // doc id doubles as the uniqueness key: one PR can only be logged once
    id: `${owner}__${repo}__${number}`.toLowerCase(),
    url: `https://github.com/${owner}/${repo}/pull/${number}`,
    owner,
    repo,
    number,
  };
}

export const isAllowedEmail = (email?: string | null) =>
  !!ALLOWED_DOMAIN && !!email && email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
