#!/usr/bin/env node
// Read-only stand-in for the Tulum API, for app checks against real data.
//
// It forwards a fixed list of GET routes whose handlers only read to the real
// API and answers every other request itself, so nothing the app does can
// write to Supabase while the real API keeps running. Point the Android
// emulator at it, then restore the direct route when you finish:
//
//   node scripts/tulum-readonly-api-proxy.mjs
//   adb reverse tcp:3001 tcp:3002
//   ...
//   adb reverse tcp:3001 tcp:3001
//
// PORT (default 3002) and TULUM_API_UPSTREAM (default http://127.0.0.1:3001)
// override the defaults. TULUM_PROXY_FIXTURES names a JSON file that answers
// chosen routes locally instead, e.g. { "GET /tickets": [ ...a live ticket ] }
// to reach screens the account's real data can't show. Logs show the method
// and path only, never headers, tokens or query strings.

import { readFileSync } from "node:fs";
import http from "node:http";

const port = Number(process.env.PORT ?? 3002);
const upstream = new URL(
  process.env.TULUM_API_UPSTREAM ?? "http://127.0.0.1:3001",
);

// Keyed by "METHOD /path", without the query string.
const fixtures = process.env.TULUM_PROXY_FIXTURES
  ? JSON.parse(readFileSync(process.env.TULUM_PROXY_FIXTURES, "utf8"))
  : {};

// GET routes whose handlers only read (checked in apps/api/src, 2026-11-02).
const readOnlyRoutes = [
  /^\/events\/active$/,
  /^\/users\/me$/,
  /^\/guests\/me$/,
  /^\/guests\/swipeable$/,
  /^\/settings\/me$/,
  /^\/tickets$/,
  /^\/tickets\/attendees$/,
  /^\/matches\/mine$/,
  /^\/favorites$/,
];

// Event details records a 'seen' row for a signed-in caller, so it is
// forwarded without the Authorization header.
const anonymousRoutes = [/^\/events\/active\/[^/]+$/];

const counts = { forwarded: 0, blocked: 0 };

function log(outcome, method, path) {
  console.log(`${new Date().toISOString()} ${outcome} ${method} ${path}`);
}

function block(req, res, path) {
  counts.blocked += 1;
  log("BLOCKED", req.method, path);
  res.writeHead(503, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      statusCode: 503,
      message: "Blocked by the read-only QA proxy",
    }),
  );
}

function forward(req, res, path, { anonymous }) {
  const headers = { ...req.headers, host: upstream.host };
  if (anonymous) delete headers.authorization;

  const proxied = http.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers,
    },
    (upstreamRes) => {
      counts.forwarded += 1;
      log(`${upstreamRes.statusCode}`, req.method, path);
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  proxied.on("error", (error) => {
    log(`UPSTREAM ERROR (${error.code ?? error.message})`, req.method, path);
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(proxied);
}

function handle(req, res) {
  let path;
  try {
    path = new URL(req.url ?? "", "http://proxy.invalid").pathname;
  } catch {
    block(req, res, "(unparsable URL)");
    return;
  }

  const fixture = fixtures[`${req.method} ${path}`];
  const reads = req.method === "GET" || req.method === "OPTIONS";
  if (fixture !== undefined) {
    log("FIXTURE", req.method, path);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(fixture));
  } else if (reads && readOnlyRoutes.some((route) => route.test(path))) {
    forward(req, res, path, { anonymous: false });
  } else if (reads && anonymousRoutes.some((route) => route.test(path))) {
    forward(req, res, path, { anonymous: true });
  } else {
    block(req, res, path);
  }
}

// The chat socket can send messages, so WebSocket upgrades are refused.
function refuseUpgrade(req, socket) {
  counts.blocked += 1;
  log("BLOCKED", "UPGRADE", (req.url ?? "").split("?")[0]);
  socket.destroy();
}

for (const host of ["127.0.0.1", "::1"]) {
  const server = http.createServer(handle);
  server.on("upgrade", refuseUpgrade);
  server.on("error", (error) => {
    console.error(`Could not listen on [${host}]:${port}: ${error.message}`);
    if (host === "127.0.0.1") process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(
      `Read-only API proxy on [${host}]:${port} -> ${upstream.origin}`,
    );
  });
}

process.on("SIGINT", () => {
  console.log(
    `Stopping: ${counts.forwarded} forwarded, ${counts.blocked} blocked.`,
  );
  process.exit(0);
});
