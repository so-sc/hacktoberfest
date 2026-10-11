// npm test
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.NEXT_PUBLIC_ALLOWED_DOMAIN = "example.edu";
const { parsePrUrl, isAllowedEmail } = await import("./pr.ts");

test("parsePrUrl", () => {
  assert.deepEqual(parsePrUrl(" https://github.com/SOSC-org/Site/pull/42/files?w=1 "), {
    id: "sosc-org__site__42",
    url: "https://github.com/SOSC-org/Site/pull/42",
    owner: "SOSC-org",
    repo: "Site",
    number: 42,
  });
  assert.equal(parsePrUrl("https://github.com/a/b/issues/1"), null);
  assert.equal(parsePrUrl("https://gitlab.com/a/b/pull/1"), null);
  assert.equal(parsePrUrl("http://github.com/a/b/pull/1"), null);
  assert.equal(parsePrUrl("https://github.com/a/b/pull/0"), null);
  assert.equal(parsePrUrl("not a url"), null);
});

test("isAllowedEmail", () => {
  assert.ok(isAllowedEmail("Someone@EXAMPLE.edu"));
  assert.ok(!isAllowedEmail("x@gmail.com"));
  assert.ok(!isAllowedEmail("x@example.edu.evil.com"));
  assert.ok(!isAllowedEmail(null));
});
