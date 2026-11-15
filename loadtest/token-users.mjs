#!/usr/bin/env node
// The load test's users: real accounts on the staging Clerk app's
// development instance, each with a session the k6 script mints tokens
// from. Use a Clerk application of its own for staging, without webhooks,
// so these users never reach the main database; the API makes their users
// rows itself on their first request. The main app runs on a development
// instance too, so create also refuses an instance with real users on it.
//
//   CLERK_SECRET_KEY=sk_test_... node loadtest/token-users.mjs create 90
//   CLERK_SECRET_KEY=sk_test_... node loadtest/token-users.mjs sessions
//   CLERK_SECRET_KEY=sk_test_... node loadtest/token-users.mjs delete --yes
//
// create makes the missing users up to the count, then a session for each,
// and writes loadtest/.token-users.json. sessions makes new sessions for the
// existing ones (they expire). delete removes them from Clerk.
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const { createClerkClient } = require("@clerk/backend");

/** A development instance's limit. */
const MAX_USERS = 100;
/** The staging app starts empty; a few accounts of your own are fine. */
const MAX_OTHER_USERS = 5;
/** Clerk's development Backend API allows 100 calls per 10 s. */
const PAUSE_MS = 150;
const OUTPUT = new URL("./.token-users.json", import.meta.url);

const pad = (n) => String(n).padStart(2, "0");
const emailOf = (n) => `load-${pad(n)}+clerk_test@example.com`;
const LOAD_EMAIL = /^load-(\d+)\+clerk_test@example\.com$/;
const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

const secretKey = process.env.CLERK_SECRET_KEY ?? "";
if (!secretKey.startsWith("sk_test_")) {
  console.error(
    "Set CLERK_SECRET_KEY to the staging Clerk app's development key (sk_test_...).",
  );
  process.exit(1);
}
const clerk = createClerkClient({ secretKey });

/** The load users already on the instance, by number. */
async function loadUsers() {
  const found = new Map();
  for (let offset = 0; ; offset += 100) {
    const { data } = await clerk.users.getUserList({
      query: "+clerk_test@example.com",
      limit: 100,
      offset,
    });
    for (const user of data) {
      for (const { emailAddress } of user.emailAddresses) {
        const match = LOAD_EMAIL.exec(emailAddress);
        if (match) found.set(Number(match[1]), user.id);
      }
    }
    if (data.length < 100) return found;
    await pause();
  }
}

async function writeSessions(users) {
  const rows = [];
  for (const [n, userId] of [...users].sort(([a], [b]) => a - b)) {
    const session = await clerk.sessions.createSession({ userId });
    rows.push({ n, userId, sessionId: session.id });
    await pause();
  }
  writeFileSync(OUTPUT, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`Wrote ${rows.length} sessions to ${fileURLToPath(OUTPUT)}`);
}

async function create(count) {
  const existing = await loadUsers();
  const total = await clerk.users.getCount();
  // A sk_test_ key alone doesn't tell the staging app from the main one.
  const others = total - existing.size;
  if (others > MAX_OTHER_USERS) {
    console.error(
      `The instance has ${others} users besides the load users, so it isn't the staging app (that starts empty). Check CLERK_SECRET_KEY.`,
    );
    process.exit(1);
  }
  const missing = [];
  for (let n = 1; n <= count; n++) if (!existing.has(n)) missing.push(n);
  if (total + missing.length > MAX_USERS) {
    console.error(
      `The instance has ${total} users; ${missing.length} more would pass its limit of ${MAX_USERS}. Ask for fewer.`,
    );
    process.exit(1);
  }
  for (const n of missing) {
    const user = await clerk.users.createUser({
      emailAddress: [emailOf(n)],
      username: `load${pad(n)}_${randomBytes(3).toString("hex")}`,
      password: randomBytes(24).toString("base64url"),
      firstName: "Load",
      lastName: pad(n),
      skipPasswordChecks: true,
    });
    existing.set(n, user.id);
    console.log(`Created ${emailOf(n)}`);
    await pause();
  }
  const wanted = new Map([...existing].filter(([n]) => n <= count));
  await writeSessions(wanted);
}

async function remove(confirmed) {
  const existing = await loadUsers();
  if (!confirmed) {
    console.log(`Would delete ${existing.size} load users. Add --yes to do it.`);
    return;
  }
  for (const [n, userId] of existing) {
    await clerk.users.deleteUser(userId);
    console.log(`Deleted ${emailOf(n)}`);
    await pause();
  }
}

const [command, argument] = process.argv.slice(2);
if (command === "create") await create(Number(argument ?? 90));
else if (command === "sessions") await writeSessions(await loadUsers());
else if (command === "delete") await remove(argument === "--yes");
else {
  console.log("Usage: token-users.mjs create [count] | sessions | delete [--yes]");
  process.exit(command ? 1 : 0);
}
